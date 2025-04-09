import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../../services/authContext';
import { createOrUpdateUserProfile } from '../../services/supabase/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

// Import our new user utils
import { 
  updateUserProfile as updateUserProfileUtil,
  trackAuthState,
  setSeenOnboarding
} from '../../services/supabase/userUtils';

type ProfileCreationRouteProp = RouteProp<RootStackParamList, 'ProfileCreation'>;
type ProfileCreationNavigationProp = StackNavigationProp<RootStackParamList, 'ProfileCreation'>;

interface Props {
  navigation: ProfileCreationNavigationProp;
  route: ProfileCreationRouteProp;
}

export default function ProfileCreationScreen({ navigation, route }: Props) {
  const { setIsNewUser, updateUserProfile, refreshUser, setProfileCreationRequired } = useContext(AuthContext);
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Initialize data from multiple sources, prioritizing route params
  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log('[ProfileCreation] Initializing data...');
        
        // Try to get userId and phoneNumber from route params first
        if (route.params?.userId) {
          console.log(`[ProfileCreation] Using userId from params: ${route.params.userId}`);
          setUserId(route.params.userId);
          await AsyncStorage.setItem('@paygo/current_user_id', route.params.userId);
        } else {
          // Try to get userId from AsyncStorage
          const storedUserId = await AsyncStorage.getItem('@paygo/current_user_id');
          if (storedUserId) {
            console.log(`[ProfileCreation] Found stored userId: ${storedUserId}`);
            setUserId(storedUserId);
          }
        }
        
        // First check if phone number is in route params
        const routePhone = route.params?.phoneNumber;
        if (routePhone) {
          console.log(`[ProfileCreation] Using phone from route params: ${routePhone}`);
          setPhoneNumber(routePhone);
          await AsyncStorage.setItem('@paygo/last_phone_number', routePhone);
          return;
        }
        
        // If not, try to get it from AsyncStorage
        const storedPhoneNumber = await AsyncStorage.getItem('@paygo/last_phone_number');
        if (storedPhoneNumber) {
          console.log(`[ProfileCreation] Using stored phone: ${storedPhoneNumber}`);
          setPhoneNumber(storedPhoneNumber);
          return;
        }
        
        console.log('[ProfileCreation] No phone number found from any source');
      } catch (error) {
        console.error('Error initializing profile data:', error);
      }
    };
    
    initializeData();
  }, [route.params]);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name to continue');
      return;
    }
    
    if (!phoneNumber) {
      setError('Phone number is required. Please restart the app and try again.');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // Get the current user ID from params or AsyncStorage
      const currentUserId = userId || await AsyncStorage.getItem('@paygo/current_user_id');
      
      if (!currentUserId) {
        setError('Authentication failed. Please restart the app and try again.');
        setIsLoading(false);
        return;
      }
      
      console.log(`[ProfileCreation] Creating profile for user ID: ${currentUserId}`);
      
      // For test users, use a consistent phone number format
      let formattedPhone = phoneNumber;
      if (currentUserId.startsWith('DEV-') && currentUserId.includes('91')) {
        formattedPhone = `+${currentUserId.replace('DEV-', '')}`;
        console.log(`[ProfileCreation] Using formatted phone from test user ID: ${formattedPhone}`);
      } else if (!phoneNumber.startsWith('+')) {
        // Ensure phone number has international format with +91 prefix
        formattedPhone = phoneNumber.startsWith('91') ? `+${phoneNumber}` : `+91${phoneNumber}`;
        console.log(`[ProfileCreation] Formatted phone number to: ${formattedPhone}`);
      }
      
      // Create a complete user profile object
      const profileData = {
        display_name: displayName.trim(),
        phone_number: formattedPhone,
        is_first_time_user: false, // Change to false since profile is now complete
        profile_complete: true,
        username: displayName.trim(),
        device_info: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
        notifications_enabled: notificationsEnabled,
      };
      
      console.log(`[ProfileCreation] Updating profile for user:`, currentUserId);
      
      // Use our new utility to update the user profile
      const userProfile = await updateUserProfileUtil(currentUserId, profileData);
      
      if (!userProfile) {
        throw new Error('Failed to update user profile');
      }
      
      console.log('[ProfileCreation] Updated user profile:', JSON.stringify(userProfile));
      
      // Update authentication state with new user info
      await trackAuthState({
        isAuthenticated: true,
        userId: currentUserId,
        phoneNumber: formattedPhone,
        displayName: displayName.trim()
      });
      
      // Mark onboarding as seen
      await setSeenOnboarding(true);
      
      // Update auth context if needed (for compatibility)
      updateUserProfile(userProfile);
      setIsNewUser(false);
      setProfileCreationRequired(false);
      
      console.log('[ProfileCreation] Profile creation successful, navigating to Home');
      
      // Updated navigation logic - first navigate to Main
      navigation.navigate('Main', {
        screen: 'HomeStack',
        params: {
          screen: 'HomeMain',
          params: {
            showWelcomeOverlay: true,
            isFirstTimeUser: true,
            userId: currentUserId
          }
        }
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Empty space at top */}
            <View style={styles.topSpacer} />
            
            {/* Header with greeting */}
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>Hey there! <Text style={{fontSize: 34}}>👋</Text></Text>
              <Text style={styles.subtitle}>Let's get to know you better</Text>
            </View>
            
            {/* Form section */}
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>What should we call you?</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="Your name"
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  setError('');
                }}
                autoCapitalize="words"
                autoFocus={true}
                placeholderTextColor="#999"
              />
              
              {phoneNumber && (
                <View style={styles.phoneSection}>
                  <Text style={styles.phoneLabel}>Phone:</Text>
                  <Text style={styles.phoneText}>{phoneNumber}</Text>
                </View>
              )}
              
              {/* Notification settings */}
              <View style={styles.notificationSection}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>Booking Updates</Text>
                  <Switch
                    trackColor={{ false: "#e0e0e0", true: "#10a142" }}
                    thumbColor={"#fff"}
                    ios_backgroundColor="#e0e0e0"
                    onValueChange={setNotificationsEnabled}
                    value={notificationsEnabled}
                  />
                </View>
                <Text style={styles.notificationSubtitle}>Get instant booking notifications</Text>
                
                <View style={styles.notificationDetails}>
                  <View style={styles.notificationItem}>
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                    <Text style={styles.notificationItemText}>Instant booking confirmations and reminders</Text>
                  </View>
                  
                  <View style={styles.notificationItem}>
                    <View style={styles.infoCircle}>
                      <Ionicons name="happy-outline" size={14} color="#666" />
                    </View>
                    <Text style={styles.notificationItemSubtleText}>
                      Don't worry, no "sona babu" messages at midnight 😉
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#ff3b30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.continueButton, !displayName.trim() && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={!displayName.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    maxHeight: '60%',
  },
  topSpacer: {
    height: 16,
  },
  greetingContainer: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  formSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  nameInput: {
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        shadowOpacity: 1,
      },
      android: {
        elevation: 1,
      }
    }),
  },
  phoneSection: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  phoneLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 6,
  },
  phoneText: {
    fontSize: 13,
    color: '#666',
  },
  notificationSection: {
    marginBottom: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  notificationSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 16,
  },
  notificationDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.03)',
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        shadowOpacity: 1,
      },
      android: {
        elevation: 1,
      }
    }),
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10a142',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  infoCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  notificationItemText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  notificationItemSubtleText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff3b30',
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingBottom: 16,
  },
  continueButton: {
    backgroundColor: '#10a142',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(16, 161, 66, 0.2)',
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        shadowOpacity: 0.8,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  buttonDisabled: {
    backgroundColor: 'rgba(16, 161, 66, 0.5)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  }
}); 