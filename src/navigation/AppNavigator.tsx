import React, { useContext, useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import contexts
import { AuthContext } from '../services/authContext';

// Import screens
// Auth screens
import PhoneAuthScreen from '../screens/auth/PhoneAuthScreen';
import ProfileCreationScreen from '../screens/auth/ProfileCreationScreen';
import BookingScreen from '../screens/booking/BookingScreen';
import BookingPreviewScreen from '../screens/booking/BookingPreviewScreen';
import BookingConfirmationScreen from '../screens/booking/BookingConfirmationScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

// Define HomeStackParamList and BookingsStackParamList types to fix linter errors
export type HomeStackParamList = {
  Home: undefined;
  CenterDetail: { centerId: string };
  // Add other screens in the HomeStack as needed
};

export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetail: { bookingId: string };
  // Add other screens in the BookingsStack as needed
};

// Import stack navigators
import HomeStack from './HomeStack';
import BookingsStack from './BookingsStack';

// Main app screens
import WalletScreen from '../screens/wallet/WalletScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import SavedCentersScreen from '../screens/profile/SavedCentersScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import WalletTransactionsScreen from '../screens/wallet/WalletTransactionsScreen';
import WalletRechargeScreen from '../screens/wallet/WalletRechargeScreen';
import HelpSupportScreen from '../screens/profile/HelpSupportScreen';

// Import new screens
import PrivacyPolicyScreen from '../screens/profile/PrivacyPolicyScreen';
import TermsAndServicesScreen from '../screens/profile/TermsAndServicesScreen';
import CancellationPolicyScreen from '../screens/profile/CancellationPolicyScreen';
import AboutUsScreen from '../screens/profile/AboutUsScreen';
import LoginOverlay from '../components/LoginOverlay';
import AccountDeletionOTPScreen from '../screens/profile/AccountDeletionOTPScreen';
import WalletServiceScreen from '../screens/settings/WalletServiceScreen';

// Import admin screens
import PaymentSettingsScreen from '../screens/admin/PaymentSettingsScreen';

// Define navigator param types
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Onboarding: undefined;
  PhoneAuth: {
    returnScreen?: keyof RootStackParamList;
    returnParams?: Record<string, any>;
  } | undefined;
  OTPVerification: { phoneNumber: string; verificationId: string };
  AccountDeletionOTP: { phoneNumber: string; userId: string };
  ProfileCreation: { userId: string; phoneNumber?: string };
  HomeScreen: undefined;
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
  };
  WalletRecharge: { 
    requiredAmount?: number;
    returnScreen?: string;
    returnParams?: any;
  };
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
  WalletTransactions: undefined;
  Settings: undefined;
  Profile: undefined;
  CancellationConfirmation: {
    bookingId: string;
    centerName: string;
    date: string;
    timeSlot: string;
    price: number;
    sessionType?: string;
    refundAmount?: number;
  };
  Splash: undefined;
  OnboardingIntro: undefined;
  OnboardingCategory: undefined;
  AuthLanding: undefined;
  CreateProfile: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  TermsAndServices: undefined;
  WalletService: undefined;
};

export type MainTabParamList = {
  HomeStack: NavigatorScreenParams<HomeStackParamList>;
  BookingsStack: NavigatorScreenParams<BookingsStackParamList>;
  ProfileStack: NavigatorScreenParams<ProfileStackParamList>;
};

export type WalletStackParamList = {
  Wallet: undefined;
  WalletRecharge: { 
    requiredAmount?: number;
    returnScreen?: string;
    returnParams?: any;
  };
  WalletTransactions: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  SavedCenters: undefined;
  HelpSupport: undefined;
  PrivacyPolicy: undefined;
  TermsAndServices: undefined;
  CancellationPolicy: undefined;
  WalletTransactions: undefined;
  AboutUs: undefined;
  Wallet: undefined;
  PaymentSettings: undefined;
  WalletService: undefined;
};

// Create navigators
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function WalletStack() {
  const WalletStackNav = createStackNavigator<WalletStackParamList>();
  return (
    <WalletStackNav.Navigator screenOptions={{ headerShown: false }}>
      <WalletStackNav.Screen name="Wallet" component={WalletScreen} />
      <WalletStackNav.Screen name="WalletRecharge" component={WalletRechargeScreen} />
      <WalletStackNav.Screen name="WalletTransactions" component={WalletTransactionsScreen} />
    </WalletStackNav.Navigator>
  );
}

function ProfileStack() {
  const ProfileStackNav = createStackNavigator<ProfileStackParamList>();
  return (
    <ProfileStackNav.Navigator>
      <ProfileStackNav.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="SavedCenters"
        component={SavedCentersScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="TermsAndServices"
        component={TermsAndServicesScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="CancellationPolicy"
        component={CancellationPolicyScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="AboutUs"
        component={AboutUsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="WalletTransactions"
        component={WalletTransactionsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="PaymentSettings"
        component={PaymentSettingsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="WalletService"
        component={WalletServiceScreen}
        options={{ headerShown: false }}
      />
    </ProfileStackNav.Navigator>
  );
}

function MainTabs() {
  const { isGuestMode } = useContext(AuthContext);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [loginOverlayConfig, setLoginOverlayConfig] = useState<{
    returnScreen?: keyof RootStackParamList;
    returnParams?: any;
  }>({});

  const handleTabPress = (route: string) => {
    if (isGuestMode && route === 'BookingsStack') {
      setLoginOverlayConfig({
        returnScreen: 'Main',
        returnParams: {
          screen: route
        }
      });
      setShowLoginOverlay(true);
      return false; // Prevent navigation
    }
    return true; // Allow navigation
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = "home";

            if (route.name === 'HomeStack') {
              iconName = 'home';
            } else if (route.name === 'BookingsStack') {
              iconName = 'calendar';
            } else if (route.name === 'ProfileStack') {
              iconName = 'user';
            }

            // @ts-ignore - FontAwesome has these icons even if types don't recognize them
            return <FontAwesome name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#118347',
          tabBarInactiveTintColor: '#777777',
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 88 : 70,
            paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 5
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            paddingBottom: 5
          },
          tabBarButton: (props) => {
            // Extract onPress in a type-safe way
            const { onPress, ...otherProps } = props;
            
            return (
              <TouchableOpacity
                {...otherProps}
                onPress={() => {
                  if (handleTabPress(route.name) && typeof onPress === 'function') {
                    onPress();
                  }
                }}
              />
            );
          }
        })}
      >
        <Tab.Screen 
          name="HomeStack" 
          component={HomeStack} 
          options={{ title: 'Home', headerShown: false }}
        />
        <Tab.Screen 
          name="BookingsStack" 
          component={BookingsStack} 
          options={{ title: 'Bookings', headerShown: false }}
        />
        <Tab.Screen 
          name="ProfileStack" 
          component={ProfileStack} 
          options={{ title: 'Profile', headerShown: false }}
        />
      </Tab.Navigator>

      <LoginOverlay
        visible={showLoginOverlay}
        onClose={() => setShowLoginOverlay(false)}
        returnScreen={loginOverlayConfig.returnScreen}
        returnParams={loginOverlayConfig.returnParams}
      />
    </>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, profileCreationRequired, user, isGuestMode } = useContext(AuthContext);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [asyncProfileRequired, setAsyncProfileRequired] = useState<boolean | null>(null);
  
  // Check AsyncStorage for profile_creation_required flag
  useEffect(() => {
    const checkProfileCreationFlag = async () => {
      try {
        const profileRequired = await AsyncStorage.getItem('@paygo/profile_creation_required');
        setAsyncProfileRequired(profileRequired === 'true');
        console.log(`[Navigation] AsyncStorage profile_creation_required: ${profileRequired}`);
      } catch (error) {
        console.error('[Navigation] Error checking profile creation flag:', error);
        setAsyncProfileRequired(null);
      }
    };
    
    if (isAuthenticated) {
      checkProfileCreationFlag();
    }
  }, [isAuthenticated]);
  
  // Track app startup and route requirements
  useEffect(() => {
    const trackAppInitialization = async () => {
      try {
        console.log(`[Navigation] App initialized with auth state:`, { 
          isAuthenticated, 
          profileCreationRequired,
          asyncProfileRequired,
          userId: user?.id,
          isGuestMode
        });
        
        // Store navigation state in AsyncStorage for debugging
        await AsyncStorage.setItem('@paygo/last_navigation_state', JSON.stringify({
          isAuthenticated,
          profileCreationRequired,
          asyncProfileRequired,
          hasUserId: !!user?.id,
          isGuestMode,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('[Navigation] Error tracking app initialization:', error);
      } finally {
        // Mark first load as complete after a delay
        setTimeout(() => setIsFirstLoad(false), 200);
      }
    };
    
    trackAppInitialization();
  }, [isAuthenticated, profileCreationRequired, asyncProfileRequired, user?.id, isGuestMode]);
  
  // Early return until state is stable
  if (isFirstLoad) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      </Stack.Navigator>
    );
  }

  // Determine which screen to show first based on auth state
  let initialRoute: keyof RootStackParamList = 'Onboarding';
  
  if (isAuthenticated) {
    // Use the most reliable source of truth for profile creation requirement
    const needsProfile = asyncProfileRequired !== null 
      ? asyncProfileRequired 
      : profileCreationRequired;
      
    initialRoute = needsProfile ? 'ProfileCreation' : 'Main';
    console.log(`[Navigation] Initial route for authenticated user: ${initialRoute}`);
  } else if (isGuestMode) {
    initialRoute = 'Main';
  }
  
  return (
    <Stack.Navigator 
      initialRouteName={initialRoute}
      screenOptions={{ 
        headerShown: false,
        presentation: 'card',
        animation: 'slide_from_right'
      }}
    >
      {/* Authentication and onboarding screens */}
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen 
        name="PhoneAuth" 
        component={PhoneAuthScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="ProfileCreation" 
        component={ProfileCreationScreen} 
        options={{
          headerShown: false,
          gestureEnabled: false
        }}
      />
      
      {isAuthenticated ? (
        // Authenticated user flow
        <>
          {/* Main app screens */}
          <Stack.Screen name="Main" component={MainTabs} />
          
          {/* Common authenticated screens */}
          <Stack.Group screenOptions={{ presentation: 'card' }}>
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen 
              name="BookingPreview" 
              component={BookingPreviewScreen}
              options={{
                presentation: 'transparentModal',
                animation: 'slide_from_bottom',
                headerShown: false,
                cardStyle: { 
                  backgroundColor: 'transparent',
                  opacity: 1
                },
                cardOverlayEnabled: true,
                gestureEnabled: true,
                gestureDirection: 'vertical',
                cardStyleInterpolator: ({ current: { progress } }) => ({
                  cardStyle: {
                    opacity: progress
                  },
                  overlayStyle: {
                    opacity: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.6]
                    })
                  }
                })
              }}
            />
            <Stack.Screen 
              name="AccountDeletionOTP"
              component={AccountDeletionOTPScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                gestureEnabled: true,
                gestureDirection: 'vertical'
              }}
            />
            <Stack.Screen 
              name="WalletRecharge" 
              component={WalletRechargeScreen}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal'
              }}
            />
            <Stack.Screen 
              name="BookingConfirmation" 
              component={BookingConfirmationScreen} 
              options={{
                presentation: 'modal',
                animation: 'fade',
                headerShown: false
              }}
            />
            <Stack.Screen name="WalletService" component={WalletServiceScreen} />
          </Stack.Group>
        </>
      ) : isGuestMode ? (
        // Guest mode flow
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Group screenOptions={{ presentation: 'card' }}>
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen 
              name="BookingPreview" 
              component={BookingPreviewScreen}
              options={{
                presentation: 'transparentModal',
                animation: 'slide_from_bottom',
                headerShown: false,
                cardStyle: { 
                  backgroundColor: 'transparent',
                  opacity: 1
                },
                cardOverlayEnabled: true,
                gestureEnabled: true,
                gestureDirection: 'vertical',
                cardStyleInterpolator: ({ current: { progress } }) => ({
                  cardStyle: {
                    opacity: progress
                  },
                  overlayStyle: {
                    opacity: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.6]
                    })
                  }
                })
              }}
            />
            <Stack.Screen 
              name="TermsAndServices" 
              component={TermsAndServicesScreen} 
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right'
              }}
            />
            <Stack.Screen 
              name="PrivacyPolicy" 
              component={PrivacyPolicyScreen} 
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right'
              }}
            />
          </Stack.Group>
        </>
      ) : (
        // Unauthenticated flow (just ensure there are no duplicate screens)
        <>
          {/* Unauthenticated screens can go here */}
        </>
      )}
    </Stack.Navigator>
  );
} 