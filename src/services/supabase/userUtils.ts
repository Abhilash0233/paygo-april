import { supabase } from '../../config/supabaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from './userService';
import { v4 as uuidv4 } from 'uuid';

// Storage keys for maintaining app state
const AUTH_STATE_KEY = '@paygo/auth_state';
const USER_PROFILE_KEY = '@paygo/user_profile';
const SEEN_ONBOARDING_KEY = '@paygo/seen_onboarding';
const LAST_AUTH_SCREEN_KEY = '@paygo/last_auth_screen';

/**
 * Generate a consistent user ID in the PG-XXXX-YYYY format
 * where XXXX is derived from the phone number and YYYY is a random string
 */
export function generateUserId(phoneNumber: string): string {
  // Clean the phone number - remove non-digit characters
  const cleanedPhone = phoneNumber.replace(/\D/g, '');
  
  // Take the last 4 digits of the phone number
  const lastFourDigits = cleanedPhone.slice(-4);
  
  // Generate a random 4-character string (uppercase letters)
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // Combine to create a user-friendly ID
  return `PG-${lastFourDigits}-${randomChars}`;
}

/**
 * Create a new user in Supabase
 */
export async function createUser(phoneNumber: string, displayName?: string): Promise<UserProfile | null> {
  try {
    // Generate a user ID that's friendly and consistent
    const userId = generateUserId(phoneNumber);
    
    // Format phone number to ensure consistency (E.164 format)
    const formattedPhone = phoneNumber.startsWith('+') ? 
      phoneNumber : 
      `+${phoneNumber.replace(/^\+/, '')}`;
    
    // Check if user with this phone number already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', formattedPhone)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing user:', checkError);
      return null;
    }
    
    // If user exists, return the existing profile
    if (existingUser) {
      console.log('User already exists:', existingUser);
      return existingUser as UserProfile;
    }
    
    // Create a new user profile
    const newUser: Partial<UserProfile> = {
      user_id: userId,
      phone_number: formattedPhone,
      display_name: displayName || '',
      wallet_balance: 0, // Start with zero balance
      is_first_time_user: true,
      login_count: 1,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      whatsapp_enabled: false,
      profile_complete: !!displayName,
      email_verified: false,
      notifications_enabled: true
    };
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('users')
      .insert(newUser)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    
    console.log('User created successfully:', data);
    return data as UserProfile;
  } catch (error) {
    console.error('Exception in createUser:', error);
    return null;
  }
}

/**
 * Track the user's authentication state in the app
 */
export async function trackAuthState(state: {
  isAuthenticated: boolean;
  userId?: string;
  phoneNumber?: string;
  displayName?: string;
}): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
    
    if (state.isAuthenticated && state.userId) {
      // Store last seen screen for recovery
      await AsyncStorage.setItem(LAST_AUTH_SCREEN_KEY, 'authenticated');
      
      // Update last login in database if we have a user ID
      const { error } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', state.userId);
      
      if (error) {
        console.error('Error updating last login:', error);
      }
    } else {
      // Clear specific keys when logging out
      await AsyncStorage.removeItem(USER_PROFILE_KEY);
    }
  } catch (error) {
    console.error('Error tracking auth state:', error);
  }
}

/**
 * Retrieve the current authentication state
 */
export async function getAuthState(): Promise<{
  isAuthenticated: boolean;
  userId?: string;
  phoneNumber?: string;
  displayName?: string;
}> {
  try {
    const stateJSON = await AsyncStorage.getItem(AUTH_STATE_KEY);
    
    if (stateJSON) {
      return JSON.parse(stateJSON);
    }
    
    return { isAuthenticated: false };
  } catch (error) {
    console.error('Error retrieving auth state:', error);
    return { isAuthenticated: false };
  }
}

/**
 * Track whether the user has seen the onboarding screens
 */
export async function setSeenOnboarding(hasSeen: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_ONBOARDING_KEY, hasSeen ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting onboarding flag:', error);
  }
}

/**
 * Check if the user has seen the onboarding screens
 */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SEEN_ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding flag:', error);
    return false;
  }
}

/**
 * Complete the OTP verification flow
 */
export async function completeOtpVerification(
  phoneNumber: string,
  isNewUser: boolean,
  displayName?: string
): Promise<{
  success: boolean;
  userId?: string;
  profile?: UserProfile;
  error?: string;
}> {
  try {
    // Format phone for consistency
    const formattedPhone = phoneNumber.startsWith('+') ? 
      phoneNumber : 
      `+${phoneNumber.replace(/^\+/, '')}`;
    
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', formattedPhone)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing user:', checkError);
      return { 
        success: false, 
        error: 'Failed to check if user exists' 
      };
    }
    
    let userProfile: UserProfile | null = null;
    
    // If user exists, update their profile
    if (existingUser) {
      console.log('User exists, updating profile:', existingUser);
      
      // Update login count and last login
      const updateData: Partial<UserProfile> = {
        last_login: new Date().toISOString(),
        login_count: (existingUser.login_count || 0) + 1
      };
      
      // If display name is provided and user doesn't have one, update it
      if (displayName && !existingUser.display_name) {
        updateData.display_name = displayName;
        updateData.profile_complete = true;
      }
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', existingUser.user_id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating existing user:', updateError);
        // Fall back to the existing user data even if update fails
        userProfile = existingUser as UserProfile;
      } else {
        userProfile = updatedUser as UserProfile;
      }
      
      // Store profile and authentication state
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
      await trackAuthState({
        isAuthenticated: true,
        userId: userProfile.user_id,
        phoneNumber: formattedPhone,
        displayName: userProfile.display_name
      });
      
      return {
        success: true,
        userId: userProfile.user_id,
        profile: userProfile
      };
    } 
    // If user doesn't exist and this is a new user flow, create them
    else if (isNewUser) {
      console.log('Creating new user for phone:', formattedPhone);
      
      userProfile = await createUser(formattedPhone, displayName);
      
      if (!userProfile) {
        return {
          success: false,
          error: 'Failed to create user profile'
        };
      }
      
      // Store profile and authentication state
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
      await trackAuthState({
        isAuthenticated: true,
        userId: userProfile.user_id,
        phoneNumber: formattedPhone,
        displayName: userProfile.display_name
      });
      
      return {
        success: true,
        userId: userProfile.user_id,
        profile: userProfile
      };
    } 
    // If user doesn't exist but this isn't a new user flow (unexpected)
    else {
      return {
        success: false,
        error: 'User not found and not creating a new account'
      };
    }
  } catch (error) {
    console.error('Exception in completeOtpVerification:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Update a user's profile information
 */
export async function updateUserProfile(
  userId: string, 
  profileData: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    // Remove id and user_id from the update data if present
    const { id, user_id, ...updateData } = profileData;
    
    // Add last_updated timestamp
    const dataToUpdate = {
      ...updateData,
      last_updated: new Date().toISOString()
    };
    
    // Update the profile in Supabase
    const { data, error } = await supabase
      .from('users')
      .update(dataToUpdate)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
    
    // Update local storage with new profile
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(data));
    
    return data as UserProfile;
  } catch (error) {
    console.error('Exception in updateUserProfile:', error);
    return null;
  }
}

/**
 * Get a user's current profile, first from AsyncStorage for speed,
 * then from Supabase for accuracy
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    // Try to get from local storage first (faster)
    const profileJSON = await AsyncStorage.getItem(USER_PROFILE_KEY);
    let profile: UserProfile | null = null;
    
    if (profileJSON) {
      profile = JSON.parse(profileJSON);
    }
    
    // Get the current auth state
    const authState = await getAuthState();
    
    // If we're authenticated, fetch the latest from the database
    if (authState.isAuthenticated && authState.userId) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', authState.userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        // Return the cached profile if we have one
        return profile;
      }
      
      // Update local storage
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(data));
      
      return data as UserProfile;
    }
    
    // Return cached profile if we have one but couldn't fetch fresh data
    return profile;
  } catch (error) {
    console.error('Exception in getCurrentUserProfile:', error);
    return null;
  }
}

/**
 * Log the user out and clear auth state
 */
export async function logout(): Promise<boolean> {
  try {
    // Clear all auth state
    await AsyncStorage.removeItem(AUTH_STATE_KEY);
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
    await AsyncStorage.removeItem(LAST_AUTH_SCREEN_KEY);
    
    // Sign out from Supabase auth if applicable
    await supabase.auth.signOut();
    
    // Update auth state
    await trackAuthState({ isAuthenticated: false });
    
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
} 