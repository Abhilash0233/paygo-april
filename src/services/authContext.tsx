import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, getUserProfile, updateLastLogin, createOrUpdateUserProfile } from './supabase/userService';
import { Platform } from 'react-native';
import { 
  sendVerificationCode, 
  verifyCode, 
  clearAuthState, 
  enableGuestMode as enableGuestModeStorage,
  disableGuestMode as disableGuestModeStorage,
  isGuestModeEnabled
} from './supabase/authService';

// Define the context types without Firebase auth dependencies
interface AuthContextType {
  isLoading: boolean;
  user: UserProfile | null;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  updateUserProfile: (user: UserProfile | null) => void;
  setCurrentUser: (user: any) => Promise<void>;
  logout: () => Promise<void>;
  isGuestMode: boolean;
  setGuestMode: (isGuest: boolean) => Promise<void>;
  requestPhoneOtp: (phoneNumber: string) => Promise<string>;
  verifyOtp: (verificationId: string, otp: string, phoneNumber?: string) => Promise<any>;
  isNewUser: boolean;
  setIsNewUser: (value: boolean) => void;
  profileCreationRequired: boolean;
  setProfileCreationRequired: (value: boolean) => void;
  completeAuthentication: (userId: string, phoneNumber: string, displayName?: string) => Promise<boolean>;
  enableGuestMode: () => void;
  disableGuestMode: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  user: null,
  isAuthenticated: false,
  refreshUser: async () => {},
  updateUserProfile: () => {},
  setCurrentUser: async () => {},
  logout: async () => {},
  isGuestMode: false,
  setGuestMode: async () => {},
  requestPhoneOtp: async () => '',
  verifyOtp: async () => ({}),
  isNewUser: false,
  setIsNewUser: () => {},
  profileCreationRequired: false,
  setProfileCreationRequired: () => {},
  completeAuthentication: async () => false,
  enableGuestMode: () => {},
  disableGuestMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: any;
}

// Flag to track first-time app launch for auth handling
const INITIAL_LAUNCH_KEY = 'is_initial_launch';
const CURRENT_USER_KEY = '@paygo/current_user_id';
const GUEST_MODE_KEY = '@paygo/guest_mode';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, initialUser = null }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [currentUser, setCurrentUserState] = useState<any | null>(initialUser);
  const [loading, setLoading] = useState<boolean>(true);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [profileCreationRequired, _setProfileCreationRequired] = useState<boolean>(false);
  const [isSettingProfileCreation, setIsSettingProfileCreation] = useState<boolean>(false);

  // Debounced profile creation required setter to prevent multiple state updates
  const setProfileCreationRequired = (value: boolean) => {
    // Skip if we're already setting to this value to prevent double renders
    if (profileCreationRequired === value || isSettingProfileCreation) {
      return;
    }
    
    setIsSettingProfileCreation(true);
    console.log(`[AuthContext] Setting profileCreationRequired to ${value}`);
    
    // Store this change in AsyncStorage for debugging/recovery
    AsyncStorage.setItem('@paygo/profile_creation_required', value ? 'true' : 'false')
      .then(() => {
        // Also store timestamp for when this changed
        return AsyncStorage.setItem('@paygo/profile_creation_required_changed', new Date().toISOString());
      })
      .catch(error => {
        console.error('[AuthContext] Error storing profile creation state:', error);
      });
    
    // Use setTimeout to debounce and ensure we don't get multiple rapid updates
    setTimeout(() => {
      _setProfileCreationRequired(value);
      setIsSettingProfileCreation(false);
    }, 100);
  };

  /**
   * Complete authentication process by updating user state
   */
  const completeAuthentication = async (
    userId: string, 
    phoneNumber: string,
    displayName?: string
  ): Promise<boolean> => {
    try {
      console.log(`[AUTH CONTEXT] Completing authentication for user: ${userId}, phone: ${phoneNumber}`);
      if (displayName) {
        console.log(`[AUTH CONTEXT] Display name provided: ${displayName}`);
      }
      
      // Ensure we are not in guest mode
      if (isGuestMode) {
        await disableGuestModeStorage();
        setIsGuestMode(false);
      }
      
      // Save user ID to AsyncStorage
      await AsyncStorage.setItem(CURRENT_USER_KEY, userId);
      await AsyncStorage.setItem('@paygo/authentication_timestamp', new Date().toISOString());
      
      // Update the last login timestamp for the user
      const lastLoginUpdated = await updateLastLogin(userId);
      
      if (!lastLoginUpdated) {
        console.warn('[AUTH CONTEXT] Failed to update last login, but continuing authentication');
      }
      
      // Fetch the full user profile
      let userProfile = null;
      const isTestUser = userId.startsWith('DEV-');
      
      try {
        userProfile = await getUserProfile(userId);
      } catch (profileError) {
        console.error('[AUTH CONTEXT] Error fetching user profile:', profileError);
      }
      
      // If no profile or error fetching, and this is a test user, create a fallback profile
      if (!userProfile && isTestUser) {
        console.log('[AUTH CONTEXT] No profile found for test user. Creating one...');
        
        try {
          // Create minimal profile for test user
          const testUserData = {
            user_id: userId,
            phone_number: phoneNumber || `+91${userId.replace('DEV-91', '')}`,
            display_name: displayName || 'Test User',
            wallet_balance: 0,
            is_first_time_user: false,
            login_count: 1
          };
          
          userProfile = await createOrUpdateUserProfile(testUserData);
          console.log(`[AUTH CONTEXT] Created new test user profile: ${JSON.stringify(userProfile)}`);
        } catch (createError) {
          console.error('[AUTH CONTEXT] Error creating test user profile:', createError);
          
          // Still proceed with a minimal profile object
          userProfile = {
            id: userId,
            user_id: userId,
            phone_number: phoneNumber,
            display_name: displayName || 'Test User',
            wallet_balance: 0,
            is_first_time_user: false,
            login_count: 1,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            last_updated: new Date().toISOString()
          };
        }
      } else if (!userProfile && displayName) {
        // If we have a display name but no profile, create one
        console.log('[AUTH CONTEXT] No existing profile found, but display name provided. Creating profile...');
        try {
          const userData = {
            id: userId,
            user_id: userId,
            phone_number: phoneNumber,
            display_name: displayName,
            wallet_balance: 0,
            is_first_time_user: false,
            login_count: 1
          };
          
          userProfile = await createOrUpdateUserProfile(userData);
          console.log(`[AUTH CONTEXT] Created new user profile with display name: ${JSON.stringify(userProfile)}`);
        } catch (createError) {
          console.error('[AUTH CONTEXT] Error creating user profile:', createError);
        }
      }
      
      // If we have a user profile, proceed with authentication
      if (userProfile) {
        // If first time user, navigate to profile creation screen
        const isFirstTimeUser = userProfile.is_first_time_user !== false; // undefined or true means first time
        
        console.log(`[AUTH CONTEXT] User profile loaded: ${JSON.stringify(userProfile)}`);
        console.log(`[AUTH CONTEXT] Is first time user? ${isFirstTimeUser}`);
        
        // Update user state
        setUser(userProfile);
        setCurrentUserState({
          uid: userId,
          phoneNumber: phoneNumber,
          displayName: userProfile.display_name || ''
        });
        
        // Store profile creation requirement in state and AsyncStorage for recovery
        setProfileCreationRequired(isFirstTimeUser);
        await AsyncStorage.setItem('@paygo/profile_creation_required', isFirstTimeUser ? 'true' : 'false');
        await AsyncStorage.setItem('@paygo/profile_creation_status_checked', 'true');
        
        return true;
      } else {
        console.error('[AUTH CONTEXT] Failed to load user profile and not a test user.');
        return false;
      }
    } catch (error) {
      console.error('[AUTH CONTEXT] Error in completeAuthentication:', error);
      return false;
    }
  };

  // Set guest mode
  const setGuestMode = async (isGuest: boolean) => {
    try {
      setIsLoading(true);
      
      if (isGuest) {
        // Store guest mode preference and update state
        await enableGuestModeStorage();
        setIsGuestMode(true);
        console.log('Guest mode enabled');
      } else {
        // Remove guest mode preference and update state
        await disableGuestModeStorage();
        setIsGuestMode(false);
        console.log('Guest mode disabled');
      }
    } catch (error) {
      console.error('Error setting guest mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for guest mode
  const enableGuestMode = () => {
    setGuestMode(true);
  };
  
  const disableGuestMode = () => {
    setGuestMode(false);
  };

  // Replace the forceLogout and logout functions with a single comprehensive logout function
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Clear all auth state
      await clearAuthState();
      
      // Update user state
      setUser(null);
      setCurrentUserState(null);
      setIsGuestMode(false);
      setIsNewUser(false);
      setProfileCreationRequired(false);
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      console.log('Refreshing user authentication state');
      
      // Check if user is in guest mode
      const guestMode = await isGuestModeEnabled();
      
      if (guestMode) {
        console.log('User is in guest mode');
        setIsGuestMode(true);
        setUser(null);
        setProfileCreationRequired(false);
        setIsLoading(false);
        return;
      }
      
      // Try to get user ID from AsyncStorage
      const userId = await AsyncStorage.getItem(CURRENT_USER_KEY);
      
      if (userId) {
        console.log(`Found existing user ID: ${userId}, retrieving profile`);
        
        // Check if profile creation is explicitly required
        const profileRequired = await AsyncStorage.getItem('@paygo/profile_creation_required');
        if (profileRequired === 'true') {
          console.log('Profile creation is explicitly required according to AsyncStorage');
          setProfileCreationRequired(true);
        }
        
        // For DEV-* test users, create them if they don't exist before trying to fetch
        if (userId.startsWith('DEV-')) {
          console.log(`Test user ID detected (${userId}), ensuring it exists in the database`);
          try {
            await updateLastLogin(userId); // This function will create the user if it doesn't exist
          } catch (error) {
            console.warn(`Error ensuring test user exists: ${error}`);
          }
        }
        
        // Attempt to get user profile with retries
        let userProfile = null;
        let retryCount = 0;
        
        while (!userProfile && retryCount < 2) {
          try {
            userProfile = await getUserProfile(userId);
            if (!userProfile) {
              console.log(`Retry ${retryCount + 1}: Failed to get user profile, retrying...`);
              retryCount++;
              // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
            }
          } catch (error) {
            console.error(`Retry ${retryCount + 1}: Error getting user profile:`, error);
            retryCount++;
            if (retryCount >= 2) break;
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
          }
        }
        
        if (userProfile) {
          console.log('User profile retrieved successfully:', JSON.stringify(userProfile, null, 2));
          
          // Check if profile needs completion
          const needsProfile = !userProfile.display_name || userProfile.display_name.trim() === '';
          console.log(`Does user need profile creation? ${needsProfile}`);
          
          // Set the profile creation flag accordingly
          setProfileCreationRequired(needsProfile);
          
          // Store the decision in AsyncStorage
          await AsyncStorage.setItem('@paygo/profile_creation_required', needsProfile ? 'true' : 'false');
          
          // Update user state
          setUser(userProfile);
          setCurrentUserState({
            uid: userId,
            phoneNumber: userProfile.phone_number,
            displayName: userProfile.display_name || ''
          });
        } else {
          // We need to handle the case where the user exists in Auth but not in the database
          console.log('User profile not found in database, attempting to complete authentication');
          
          // Try to complete authentication, which will create a minimal profile
          const phoneNumber = userId.startsWith('DEV-91') ? `+${userId.replace('DEV-', '')}` : '';
          const authCompleted = await completeAuthentication(userId, phoneNumber);
          
          if (authCompleted) {
            console.log('Authentication completed successfully with new profile creation');
            // The completeAuthentication function will have set the user state
            // and profileCreationRequired flag appropriately
          } else {
            // If completing authentication fails for a non-test user, log out
            if (!userId.startsWith('DEV-')) {
              console.error('Failed to complete authentication, logging out');
              await logout();
            } else {
              // For test users, create a fallback profile
              console.log(`Creating fallback profile for test user: ${userId}`);
              
              // Extract phone number from DEV-* ID (if possible)
              let phoneNumber = '';
              if (userId.startsWith('DEV-91')) {
                phoneNumber = `+${userId.replace('DEV-', '')}`;
              }
              
              const fallbackProfile: UserProfile = {
                id: userId,
                user_id: userId,
                phone_number: phoneNumber,
                display_name: 'Test User',
                created_at: new Date().toISOString(),
                is_first_time_user: false,
                last_login: new Date().toISOString(),
                wallet_balance: 0
              };
              
              setUser(fallbackProfile);
              setCurrentUserState({
                uid: userId,
                phoneNumber: phoneNumber,
                displayName: 'Test User'
              });
              
              // Don't require profile creation for test users with fallback profile
              setProfileCreationRequired(false);
              await AsyncStorage.setItem('@paygo/profile_creation_required', 'false');
              console.log('Using fallback profile for test user, continuing authentication');
            }
          }
        }
      } else {
        console.log('No user ID found, user is not authenticated');
        setUser(null);
        setCurrentUserState(null);
        setProfileCreationRequired(false);
        await AsyncStorage.setItem('@paygo/profile_creation_required', 'false');
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // Don't clear user state on error for test users
      if (user && user.user_id.startsWith('DEV-')) {
        console.log('Keeping test user despite refresh error');
      } else {
        setUser(null);
        setCurrentUserState(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = (userProfile: UserProfile | null) => {
    if (userProfile) {
      console.log('Updating user profile in state');
      setUser(userProfile);
      
      // Update currentUser state for compatibility
      if (currentUser) {
        setCurrentUserState({
          ...currentUser,
          displayName: userProfile.display_name || '',
          phoneNumber: userProfile.phone_number || ''
        });
      }
    } else {
      console.log('Clearing user profile from state');
      setUser(null);
    }
  };

  const setCurrentUser = async (userData: any): Promise<void> => {
    try {
      if (userData) {
        console.log('Setting current user:', userData.uid);
        setCurrentUserState(userData);
        
        // Update the user profile if it exists
        if (user) {
          const updatedUser = {
            ...user,
            id: userData.uid,
            phone_number: userData.phoneNumber || user.phone_number
          };
          setUser(updatedUser);
        }
        
        // Store the user ID
        await AsyncStorage.setItem(CURRENT_USER_KEY, userData.uid);
      } else {
        console.log('Clearing current user');
        setCurrentUserState(null);
        await AsyncStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch (error) {
      console.error('Error setting current user:', error);
      throw error;
    }
  };

  // Initialize the auth state
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Initializing auth state');
        
        // Check if this is the first launch
        const isInitialLaunch = await AsyncStorage.getItem(INITIAL_LAUNCH_KEY);
        
        if (!isInitialLaunch) {
          console.log('First app launch detected');
          await AsyncStorage.setItem(INITIAL_LAUNCH_KEY, 'false');
        }
        
        // Check if user is in guest mode
        const guestMode = await isGuestModeEnabled();
        
        if (guestMode) {
          console.log('User is in guest mode, skipping auth check');
          setIsGuestMode(true);
          setIsLoading(false);
          return;
        }
        
        // Try to get the current user ID
        const userId = await AsyncStorage.getItem(CURRENT_USER_KEY);
        
        if (userId) {
          console.log(`Found user ID: ${userId}, retrieving profile`);
          
          try {
            const userProfile = await getUserProfile(userId);
            
            if (userProfile) {
              console.log('User profile retrieved, user is authenticated');
              
              setUser(userProfile);
              setCurrentUserState({
                uid: userId,
                phoneNumber: userProfile.phone_number,
                displayName: userProfile.display_name || ''
              });
              
              // Check if profile needs to be completed
              const needsProfile = !userProfile.display_name;
              setProfileCreationRequired(needsProfile);
            } else {
              console.log('User profile not found, clearing auth state');
              await clearAuthState();
            }
          } catch (error) {
            console.error('Error retrieving user profile:', error);
            await clearAuthState();
          }
        } else {
          console.log('No user ID found, user is not authenticated');
        }
      } catch (error) {
        console.error('Error initializing auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, []);

  // Request a phone OTP
  const requestPhoneOtp = async (phoneNumber: string): Promise<string> => {
    try {
      console.log(`Requesting OTP for phone number: ${phoneNumber}`);
      
      const result = await sendVerificationCode(phoneNumber);
      
      if (result.success) {
        console.log('OTP request successful, verification ID:', result.verificationId);
        return result.verificationId;
      } else {
        console.error('OTP request failed');
        throw new Error('Failed to send verification code');
      }
    } catch (error) {
      console.error('Error requesting phone OTP:', error);
      throw error;
    }
  };

  // Verify OTP
  const verifyOtp = async (verificationId: string, otp: string, phoneNumber?: string): Promise<any> => {
    try {
      console.log(`Verifying OTP for verification ID: ${verificationId}`);
      
      if (!phoneNumber) {
        console.error('Phone number is required for OTP verification');
        throw new Error('Phone number is required');
      }
      
      const result = await verifyCode(verificationId, otp, phoneNumber);
      
      if (result.success && result.userId) {
        console.log('OTP verification successful, user ID:', result.userId);
        
        // Complete the authentication process
        const authPhoneNumber = phoneNumber || '';
        const authCompleted = await completeAuthentication(result.userId, authPhoneNumber);
        
        if (!authCompleted) {
          console.error('Failed to complete authentication after OTP verification');
          throw new Error('Authentication completion failed');
        }
        
        const userPhoneNumber = result.user?.phoneNumber || phoneNumber || '';
        const authComplete = await completeAuthentication(result.userId, userPhoneNumber);
        
        return {
          user: {
            uid: result.userId,
            phoneNumber: userPhoneNumber
          },
          isNewUser: result.isNewUser
        };
      } else {
        console.error('OTP verification failed:', result.error);
        throw new Error(result.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        user,
        isAuthenticated: !!user && !isGuestMode,
        refreshUser,
        updateUserProfile,
        setCurrentUser,
        logout,
        isGuestMode,
        setGuestMode,
        requestPhoneOtp,
        verifyOtp,
        isNewUser,
        setIsNewUser,
        profileCreationRequired,
        setProfileCreationRequired,
        completeAuthentication,
        enableGuestMode,
        disableGuestMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 