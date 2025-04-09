import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabaseConfig';
import { Alert } from 'react-native';
import { getUserByPhoneNumber } from './userService';
import { isTestPhoneNumber, getTestOTP, normalizePhoneNumber } from '../auth/testPhoneNumbers';

// Storage keys
const VERIFICATION_ID_KEY = '@paygo/verification_id';
const LAST_PHONE_NUMBER_KEY = '@paygo/last_phone_number';
const CURRENT_USER_KEY = '@paygo/current_user_id';
const GUEST_MODE_KEY = '@paygo/guest_mode';

// For development mode
export const DEV_MODE = __DEV__;

// List of development phone numbers for testing
export const DEV_PHONE_NUMBERS = [
  '+915555555555',
  '+916666666666',
  '+917777777777',
  '+918888888888',
  '+919999999999',
  '+914444444444',
  '+916301998133',
  '+919876543210',
  '+919876543211',
  '+919876543212',
  '+919876543213',
  '+919876543214',
];

// Check if a phone number is a development test number
export function isDevelopmentPhone(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  
  // First check exact matches
  if (DEV_PHONE_NUMBERS.includes(phoneNumber)) {
    return true;
  }
  
  // Then check if this is a test phone number from our testPhoneNumbers.ts file
  if (isTestPhoneNumber(phoneNumber)) {
    return true;
  }
  
  // Then check if any development phone number is contained within the provided phone
  for (const devPhone of DEV_PHONE_NUMBERS) {
    // Extract the numeric part without country code or formatting
    const devPhoneDigits = devPhone.replace(/\D/g, '');
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    
    // Check if the phone number contains the dev phone digits
    if (phoneDigits.includes(devPhoneDigits) || devPhoneDigits.includes(phoneDigits)) {
      return true;
    }
  }
  
  return false;
}

// Emergency code for backup verification
export const EMERGENCY_CODE = '123456';
export const BACKUP_VERIFICATION_CODE = '123456';

/**
 * Format phone number to E.164 format for India (+91)
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Use our normalizePhoneNumber function for consistent formatting
  return normalizePhoneNumber(phoneNumber);
}

/**
 * Clear all authentication state from storage
 */
export const clearAuthState = async (): Promise<void> => {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Remove all auth-related items from AsyncStorage
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    await AsyncStorage.removeItem(VERIFICATION_ID_KEY);
    await AsyncStorage.removeItem(LAST_PHONE_NUMBER_KEY);
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    
    console.log('Auth state cleared successfully');
  } catch (error) {
    console.error('Error clearing auth state:', error);
    throw error;
  }
};

/**
 * Send an OTP verification code to the provided phone number
 */
export async function sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; verificationId: string }> {
  try {
    // Format phone number for consistency
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log(`[SUPABASE] Formatted phone number for verification: ${formattedNumber}`);
    
    // Store the phone number for later reference
    await AsyncStorage.setItem(LAST_PHONE_NUMBER_KEY, formattedNumber);
    
    // In development mode, allow test phone numbers to bypass OTP
    if (DEV_MODE && isDevelopmentPhone(formattedNumber)) {
      console.log(`[SUPABASE] Development phone detected, using mock verification: ${formattedNumber}`);
      
      // Generate a consistent verification ID for test phones based on phone
      const phoneDigits = formattedNumber.replace(/\D/g, '').slice(-6);
      const mockVerificationId = `DEV-${Date.now()}-${phoneDigits}`;
      
      await AsyncStorage.setItem(VERIFICATION_ID_KEY, mockVerificationId);
      
      // Show what codes will work with this verification
      const testOTP = getTestOTP(formattedNumber);
      if (testOTP) {
        console.log(`[SUPABASE] Valid code for this test phone: ${testOTP}`);
      } else {
        console.log(`[SUPABASE] Valid codes for this dev phone: ${BACKUP_VERIFICATION_CODE}, ${phoneDigits}, 000000`);
      }
      
      return {
        success: true,
        verificationId: mockVerificationId
      };
    }
    
    // Call Supabase auth.signInWithOtp to send OTP
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedNumber,
    });
    
    if (error) {
      console.error('[SUPABASE] Error sending OTP:', error.message);
      return {
        success: false,
        verificationId: ''
      };
    }
    
    // Generate a verification ID to track this verification attempt
    const verificationId = `SB-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await AsyncStorage.setItem(VERIFICATION_ID_KEY, verificationId);
    
    return {
      success: true,
      verificationId
    };
  } catch (error) {
    console.error('[SUPABASE] Error in sendVerificationCode:', error);
    return {
      success: false,
      verificationId: ''
    };
  }
}

/**
 * Verify OTP code
 */
export async function verifyCode(
  verificationId: string, 
  otp: string,
  phoneNumber?: string
): Promise<any> {
  try {
    console.log(`[Auth] Verifying OTP: ${otp} for verification ID: ${verificationId}`);
    
    // Format the phone
    const formattedPhone = phoneNumber ? 
      (phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/^\+/, '')}`) : '';
    
    // Check if this is ANY development phone number
    const isDevPhone = DEV_MODE && isDevelopmentPhone(formattedPhone);
    
    // For dev phones, allow any of these codes to work
    if (isDevPhone) {
      console.log(`[Auth] Development phone detected: ${formattedPhone}`);
      
      let validCodes = [
        EMERGENCY_CODE,              // 123456
        BACKUP_VERIFICATION_CODE,    // 123456
        '000000',                   
        formattedPhone.slice(-6),    // Last 6 digits of phone
      ];
      
      // Check if this is a test phone number with predefined OTP
      const testOTP = getTestOTP(formattedPhone);
      if (testOTP) {
        // For test phone numbers, only allow the predefined OTP
        console.log(`[Auth] Test phone number detected with predefined OTP: ${formattedPhone}`);
        console.log(`[Auth] Required OTP for this number: ${testOTP}`);
        validCodes = [testOTP];
      }
      
      console.log(`[Auth] Valid codes for this dev number:`, validCodes);
      console.log(`[Auth] Checking provided OTP: "${otp}" against valid codes`);
      
      if (validCodes.includes(otp)) {
        console.log('[Auth] Development verification successful');
        
        // Create a user ID for this test user
        const testUserId = `DEV-${formattedPhone.replace('+', '')}`;
        
        // Store authentication state
        await AsyncStorage.setItem('auth_type', 'test');
        await AsyncStorage.setItem('user_id', testUserId);
        await AsyncStorage.setItem('user_phone', formattedPhone);
        
        return {
          success: true,
          user: {
            uid: testUserId,
            phoneNumber: formattedPhone
          },
          userId: testUserId,
          isNewUser: true // Assume all test users are new users for easier testing
        };
      } else {
        console.error(`[Auth] Invalid code for dev phone. Valid codes:`, validCodes);
        throw new Error(`Invalid verification code. Try: ${validCodes[0]}`);
      }
    }
    
    // For regular (non-dev) phones, proceed with normal verification
    console.log(`[Auth] Verifying with Supabase: ${formattedPhone}`);
    
    try {
      // First check if user already exists by phone number
      const existingProfile = await getUserByPhoneNumber(formattedPhone);
      const isNewUser = !existingProfile;
      
      console.log('[Auth] Existing profile check by phone number:', existingProfile ? 'FOUND' : 'NOT FOUND');
      console.log('[Auth] Is new user:', isNewUser);
      
      // If this is an existing user, use their ID directly
      if (existingProfile) {
        console.log('[Auth] Using existing user profile data:', existingProfile.id);
        console.log('[Auth] Display name from existing profile:', existingProfile.display_name);
        
        // Store authentication state
        await AsyncStorage.setItem('auth_type', 'supabase');
        await AsyncStorage.setItem('user_id', existingProfile.id);
        await AsyncStorage.setItem(CURRENT_USER_KEY, existingProfile.id);
        await AsyncStorage.setItem('user_phone', formattedPhone);
        
        return {
          success: true,
          user: {
            uid: existingProfile.id,
            phoneNumber: formattedPhone,
            displayName: existingProfile.display_name || ''
          },
          userId: existingProfile.id,
          isNewUser: false
        };
      }
      
      // If no existing user found, proceed with Supabase verification
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms'
      });
      
      if (error) {
        console.error('[Auth] Supabase verification error:', error);
        throw new Error(`Verification failed: ${error.message}`);
      }
      
      console.log('[Auth] Supabase verification response:', data);
      
      if (!data || !data.user) {
        console.error('[Auth] Supabase verification returned no user data');
        throw new Error('Verification succeeded but no user data was returned');
      }
      
      // Get the user ID from Supabase
      const supabaseUserId = data.user.id;
      console.log('[Auth] Supabase user ID:', supabaseUserId);
      
      // One more check for existing users by phone (in case the first check missed it)
      const doubleCheckProfile = await getUserByPhoneNumber(formattedPhone);
      const finalUserId = doubleCheckProfile ? doubleCheckProfile.id : supabaseUserId;
      const finalIsNewUser = !doubleCheckProfile;
      
      // Store authentication state
      await AsyncStorage.setItem('auth_type', 'supabase');
      await AsyncStorage.setItem('user_id', finalUserId);
      await AsyncStorage.setItem(CURRENT_USER_KEY, finalUserId);
      await AsyncStorage.setItem('user_phone', formattedPhone);
      
      return {
        success: true,
        user: {
          uid: finalUserId,
          phoneNumber: formattedPhone,
          displayName: doubleCheckProfile?.display_name || ''
        },
        userId: finalUserId,
        isNewUser: finalIsNewUser
      };
    } catch (supabaseError) {
      console.error('[Auth] Error during Supabase verification:', supabaseError);
      
      // For development/testing purposes only - creating a fallback method
      // This should be removed in production
      if (DEV_MODE) {
        console.warn('[Auth] DEV MODE: Creating temporary user for testing');
        
        const tempUserId = `user-${Date.now()}`;
        await AsyncStorage.setItem('auth_type', 'temporary');
        await AsyncStorage.setItem('user_id', tempUserId);
        await AsyncStorage.setItem(CURRENT_USER_KEY, tempUserId);
        
        if (formattedPhone) {
          await AsyncStorage.setItem('user_phone', formattedPhone);
        }
        
        return {
          success: true,
          user: {
            uid: tempUserId,
            phoneNumber: formattedPhone
          },
          userId: tempUserId,
          isNewUser: true
        };
      }
      
      throw supabaseError;
    }
  } catch (error) {
    console.error('[Auth] Error verifying code:', error);
    throw error;
  }
}

/**
 * Retrieve the last phone number used for verification
 */
export const getLastPhoneNumber = async (): Promise<string> => {
  try {
    return await AsyncStorage.getItem(LAST_PHONE_NUMBER_KEY) || '';
  } catch (error) {
    console.error('Error getting last phone number:', error);
    return '';
  }
};

/**
 * Get the current user ID from storage
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(CURRENT_USER_KEY);
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

/**
 * Check if guest mode is enabled
 */
export const isGuestModeEnabled = async (): Promise<boolean> => {
  try {
    const guestMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
    return guestMode === 'true';
  } catch (error) {
    console.error('Error checking guest mode:', error);
    return false;
  }
};

/**
 * Enable guest mode
 */
export const enableGuestMode = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
  } catch (error) {
    console.error('Error enabling guest mode:', error);
    throw error;
  }
};

/**
 * Disable guest mode
 */
export const disableGuestMode = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
  } catch (error) {
    console.error('Error disabling guest mode:', error);
    throw error;
  }
};