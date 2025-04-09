import { supabase, getServiceRoleClient } from '../../config/supabaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

// User profile interface
export interface UserProfile {
  id: string; // UUID from Supabase
  user_id: string; // Short format ID (e.g., PG-1234-ABCD)
  phone_number: string;
  display_name?: string;
  email?: string;
  photo_url?: string; // For profile image
  whatsapp_enabled?: boolean;
  profile_complete?: boolean;
  email_verified?: boolean;
  created_at: string;
  last_login: string;
  last_updated?: string;
  device_info?: string;
  notifications_enabled?: boolean;
  is_first_time_user: boolean;
  login_count?: number;
  username?: string;
  
  // Wallet fields
  wallet_balance: number;
  wallet_created_at?: string;
}

// Transaction types
export enum TransactionType {
  DEPOSIT = 'deposit',
  BOOKING = 'booking',
  REFUND = 'refund'
}

// Transaction interface
export interface WalletTransaction {
  id?: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  description: string;
  reference?: string;
  created_at?: string;
}

// Add a reliable UUID generation method that works in React Native
function generateSecureUUID(): string {
  try {
    return uuidv4();
  } catch (error) {
    console.error('[UserService] Error with standard UUID generation:', error);
    
    try {
      // Try alternate method with Math.random
      const randomValue = () => 
        Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
        
      // Format: 8-4-4-4-12 hexadecimal characters
      return [
        randomValue().slice(0, 8),
        randomValue().slice(0, 4),
        '4' + randomValue().slice(0, 3), // Version 4 UUID
        '8' + randomValue().slice(0, 3), // Variant bits
        randomValue() + randomValue().slice(0, 4)
      ].join('-');
    } catch (secondError) {
      // If all else fails, use this hardcoded pattern with timestamp
      console.error('[UserService] Error with alternate UUID generation, using fallback:', secondError);
      const timestampHex = Date.now().toString(16).padStart(12, '0');
      return `11111111-2222-3333-4444-${timestampHex}`;
    }
  }
}

/**
 * Generate a shorter unique user ID for better user experience
 * Creates an ID in format PG-1234-ABCD where 1234 is last digits of phone
 * and ABCD is a random string for uniqueness
 */
function generateShortUserId(phoneNumber: string): string {
  console.log(`[USER_ID] Generating ID for phone: '${phoneNumber}'`);
  
  // Ensure phoneNumber is valid, use a fallback if it's empty
  if (!phoneNumber || phoneNumber.trim() === '') {
    console.log(`[USER_ID] Phone number is empty, using random digits instead`);
    // Use random digits as fallback for missing phone numbers
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PG-${randomDigits}-${randomChars}`;
  }
  
  // Extract the last 4 digits of the phone number (or fewer if number is shorter)
  // Make sure to handle non-digit characters and empty strings
  const cleaned = phoneNumber.replace(/\D/g, '');
  const lastDigits = cleaned.length > 0 ? cleaned.slice(-4) : '0000';
  
  console.log(`[USER_ID] Extracted last digits: ${lastDigits} from phone: ${phoneNumber}`);
  
  // Generate 4 random alphanumeric characters
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // Combine to form a short, readable ID
  return `PG-${lastDigits}-${randomChars}`;
}

/**
 * Check if a user exists by phone number
 */
export async function checkUserExists(phoneNumber: string): Promise<boolean> {
  try {
    console.log(`[USER] Checking if user exists with phone: ${phoneNumber}`);
    
    // Format phone number for consistency
    const formattedPhoneNumber = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber.replace(/^\+/, '')}`;
    
    const { data, error } = await supabase
      .from('users')
      .select('user_id')
      .eq('phone_number', formattedPhoneNumber)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Exception checking user existence:', error);
    return false;
  }
}

/**
 * Create or update a user profile
 */
export async function createOrUpdateUserProfile(
  userData: Partial<UserProfile>
): Promise<UserProfile> {
  try {
    console.log(`[UserService] Creating/updating user profile with data: ${JSON.stringify(userData)}`);
    
    // Special handling for test users (DEV-* IDs)
    const isTestUser = userData.user_id?.startsWith('DEV-') || userData.id?.startsWith('DEV-');
    
    if (isTestUser) {
      console.log('[UserService] Handling test user profile creation specially');
      
      // Ensure we have a consistent ID format for test users
      const testUserId = userData.user_id || userData.id || '';
      
      try {
        // First check if a user with this phone number already exists
        let existingUserByPhone = null;
        if (userData.phone_number) {
          const { data: userByPhone } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', userData.phone_number)
            .maybeSingle();
            
          existingUserByPhone = userByPhone;
          
          if (existingUserByPhone) {
            console.log(`[UserService] User with phone ${userData.phone_number} already exists, updating instead of creating`);
            
            // If user exists with this phone, update their record
            const { data, error } = await supabase
              .from('users')
              .update({
                ...userData,
                user_id: testUserId, // Ensure user_id remains consistent
                last_updated: new Date().toISOString()
              })
              .eq('phone_number', userData.phone_number)
              .select()
              .single();
              
            if (error) {
              console.error('[UserService] Error updating existing user by phone:', error);
            } else {
              return data as UserProfile;
            }
          }
        }
        
        // Proceed with normal test user flow - check by user_id
        // Check if this test user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', testUserId)
          .maybeSingle();
        
        if (existingUser) {
          console.log('[UserService] Updating existing test user profile');
          
          // Update the existing test user
          const { data, error } = await supabase
            .from('users')
            .update({
              ...userData,
              user_id: testUserId,
              last_updated: new Date().toISOString()
            })
            .eq('user_id', testUserId)
            .select()
            .single();
          
          if (error) {
            console.error('[UserService] Error updating test user profile:', error);
            
            // Return the existing user as fallback instead of throwing
            return existingUser as UserProfile;
          }
          
          return data as UserProfile;
        } else {
          console.log('[UserService] Creating new test user profile');
          
          // Use our more reliable UUID generation for new test users
          const newId = generateSecureUUID();
          console.log(`[UserService] Generated UUID for test user: ${newId}`);
          
          // Try with service role client if available for test users
          const client = getServiceRoleClient ? getServiceRoleClient() : supabase;
          
          // For test users, use a UUID for the id field but preserve the DEV-* format in user_id
          const { data, error } = await client
            .from('users')
            .insert({
              ...userData,
              id: newId,
              user_id: testUserId,
              created_at: userData.created_at || new Date().toISOString(),
              last_updated: new Date().toISOString(),
              wallet_balance: userData.wallet_balance || 0
            })
            .select()
            .single();
          
          if (error) {
            console.error('[UserService] Error creating test user profile:', error);
            
            // Check if it's a duplicate key error for phone_number
            if (error.code === '23505' && error.message?.includes('phone_number')) {
              console.log('[UserService] Duplicate phone number detected, fetching existing profile');
              
              // Fetch the existing profile by phone number
              const { data: existingProfileData } = await supabase
                .from('users')
                .select('*')
                .eq('phone_number', userData.phone_number)
                .single();
              
              if (existingProfileData) {
                console.log('[UserService] Found existing profile, updating user_id if needed');
                
                // If the user_id doesn't match, update it
                if (existingProfileData.user_id !== testUserId) {
                  const { data: updatedData, error: updateError } = await supabase
                    .from('users')
                    .update({ 
                      user_id: testUserId,
                      last_updated: new Date().toISOString() 
                    })
                    .eq('id', existingProfileData.id)
                    .select()
                    .single();
                  
                  if (!updateError && updatedData) {
                    return updatedData as UserProfile;
                  }
                }
                
                return existingProfileData as UserProfile;
              }
            }
            
            // Create a fallback user profile to return if insertion fails
            const fallbackProfile: UserProfile = {
              id: newId,
              user_id: testUserId,
              phone_number: userData.phone_number || '',
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
              is_first_time_user: true,
              wallet_balance: 0,
              ...userData
            };
            
            // Try one more time with a direct approach using the service role client
            if (getServiceRoleClient) {
              try {
                console.log('[UserService] Attempting alternative insertion method for test user');
                const serviceClient = getServiceRoleClient();
                const { data: serviceData, error: serviceError } = await serviceClient
                  .from('users')
                  .insert({
                    ...fallbackProfile,
                    id: newId
                  })
                  .select()
                  .single();
                
                if (!serviceError && serviceData) {
                  console.log('[UserService] Alternative insertion method succeeded');
                  return serviceData as UserProfile;
                }
              } catch (finalError) {
                console.error('[UserService] Final attempt also failed:', finalError);
              }
            }
            
            console.warn('[UserService] Returning fallback profile for failed test user creation');
            return fallbackProfile;
          }
          
          return data as UserProfile;
        }
      } catch (dbError) {
        console.error('[UserService] Database error in test user handling:', dbError);
        
        // Create a fallback user profile to return if database operations fail
        const fallbackProfile: UserProfile = {
          id: generateSecureUUID(),
          user_id: testUserId,
          phone_number: userData.phone_number || '',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          is_first_time_user: true,
          wallet_balance: 0,
          ...userData
        };
        
        console.warn('[UserService] Returning fallback profile after database error');
        return fallbackProfile;
      }
    }
    
    // Regular (non-test) user logic
    // Check if user already exists
    let existingUser = null;
    
    if (userData.id) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.id)
        .maybeSingle();
        
      if (!error) {
        existingUser = data;
      }
    }
    
    // If user exists, update their profile
    if (existingUser) {
      console.log(`[UserService] Updating existing user profile`);
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          ...userData,
          last_updated: new Date().toISOString()
        })
        .eq('id', userData.id)
        .select('*')
        .single();
        
      if (updateError) {
        console.error(`[UserService] Error updating user profile:`, updateError);
        throw new Error(`Failed to update user profile: ${updateError.message}`);
      }
      
      return updatedUser as UserProfile;
    }
    
    // Create new user profile
    console.log(`[UserService] Creating new user profile`);
    
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        ...userData,
        // Make sure id and user_id are consistent for new users
        id: userData.id || userData.user_id,
        created_at: userData.created_at || new Date().toISOString(),
        last_updated: new Date().toISOString()
      })
      .select('*')
      .single();
      
    if (insertError) {
      console.error(`[UserService] Error creating user profile:`, insertError);
      throw new Error(`Failed to create user profile: ${insertError.message}`);
    }
    
    return newUser as UserProfile;
  } catch (error: any) {
    console.error(`[UserService] Exception in createOrUpdateUserProfile:`, error);
    throw new Error(`Failed to create user profile: ${error.message || error}`);
  }
}

/**
 * Get user profile from Supabase
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log(`[UserService] Fetching user profile for ID: ${userId}`);
    
    // First try to get the user from the main users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userError) {
      console.error('[UserService] Error fetching user profile:', userError);
      return null;
    }
    
    if (userData) {
      console.log(`[UserService] User profile found, wallet_balance: ${userData.wallet_balance}`);
      return userData;
    }
    
    // If not found by user_id, try by id field instead (for UUID matches)
    const { data: userDataById, error: idError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (idError) {
      console.error('[UserService] Error fetching user profile by UUID:', idError);
      return null;
    }
    
    if (userDataById) {
      console.log(`[UserService] User profile found by UUID, wallet_balance: ${userDataById.wallet_balance}`);
      return userDataById;
    }
    
    console.log(`[UserService] No user profile found for ID: ${userId}`);
    return null;
  } catch (error) {
    console.error('[UserService] Exception fetching user profile:', error);
    return null;
  }
}

/**
 * Get user by phone number
 */
export async function getUserByPhoneNumber(phoneNumber: string): Promise<UserProfile | null> {
  try {
    console.log(`[USER] Fetching user by phone number: ${phoneNumber}`);
    
    // Use service role client to bypass RLS
    const adminClient = getServiceRoleClient();
    
    // Format phone number for consistency
    const formattedPhoneNumber = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber.replace(/^\+/, '')}`;
    
    const { data: userProfile, error } = await adminClient
      .from('users')
      .select('*')
      .eq('phone_number', formattedPhoneNumber)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user by phone number:', error);
      return null;
    }
    
    if (!userProfile) {
      console.log(`[USER] No user found with phone number: ${formattedPhoneNumber}`);
      return null;
    }
    
    return userProfile as UserProfile;
  } catch (error) {
    console.error('Exception in getUserByPhoneNumber:', error);
    return null;
  }
}

/**
 * Update the last login timestamp for a user
 * @param userId User ID to update
 * @returns True if the update was successful, false otherwise
 */
export async function updateLastLogin(userId: string): Promise<boolean> {
  try {
    console.log(`[UserService] Updating last login for user ${userId}`);
    
    // Determine if this is a test user
    const isTestUser = userId.startsWith('DEV-') || userId.includes('11111111-2222-3333-4444');
    
    // Choose appropriate client based on whether this is a test user
    const client = isTestUser && getServiceRoleClient ? getServiceRoleClient() : supabase;
    
    // For increment_login_count, use a separate call instead of inline in the update
    let loginCount = 1; // Default increment
    
    try {
      // Properly call the RPC function
      const { data: countData, error: countError } = await client.rpc('increment_login_count', {
        user_id_param: userId
      });
      
      if (!countError && countData !== null) {
        loginCount = countData;
        console.log(`[UserService] Successfully incremented login count to: ${loginCount}`);
      } else {
        console.warn(`[UserService] Failed to call increment_login_count: ${countError?.message || 'Unknown error'}`);
      }
    } catch (countErr) {
      console.error(`[UserService] Exception calling increment_login_count:`, countErr);
    }
    
    // Update the last login timestamp - always use user_id field for consistency
    const { error } = await client
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        login_count: loginCount // Use the value we got from the RPC or our default
      })
      .eq('user_id', userId);
    
    if (error) {
      console.error(`[UserService] Error updating last login:`, error);
      
      // If using service role failed or wasn't available, and this is a test user,
      // create a minimal profile as fallback
      if (isTestUser) {
        try {
          console.log(`[UserService] Attempting to create basic profile for test user`);
          const phoneNumber = userId.startsWith('DEV-91') ? `+${userId.replace('DEV-', '')}` : '';
          
          // Try to create a minimal profile for the test user
          await createBasicTestUserProfile(userId, phoneNumber);
          console.log(`USER SERVICE: Created basic profile for user: ${userId}`);
          return true;
        } catch (createError) {
          console.error(`[UserService] Failed to create fallback profile:`, createError);
        }
      }
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`[UserService] Exception in updateLastLogin:`, error);
    return false;
  }
}

/**
 * Create a basic profile for test users when normal creation fails
 * @param userId Test user ID 
 * @param phoneNumber Phone number if available
 */
async function createBasicTestUserProfile(userId: string, phoneNumber: string = ''): Promise<void> {
  // Always use service role client for this operation if available
  const client = getServiceRoleClient ? getServiceRoleClient() : supabase;
  
  // Create UUID for the 'id' field
  const uuid = generateSecureUUID();
  
  await client.from('users').insert({
    id: uuid,
    user_id: userId,
    phone_number: phoneNumber || `+919999${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    is_first_time_user: true,
    wallet_balance: 0,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    login_count: 1
  });
}

/**
 * Update first time user status
 */
export async function updateFirstTimeStatus(userId: string, isFirstTimeUser: boolean = false): Promise<UserProfile | null> {
  try {
    console.log(`[USER] Updating first time status for ${userId} to ${isFirstTimeUser}`);
    
    const { data, error } = await supabase
      .from('users')
      .update({
        is_first_time_user: isFirstTimeUser
      })
      .eq('user_id', userId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating first time status:', error);
      throw error;
    }
    
    // Update AsyncStorage
    try {
      const userJson = await AsyncStorage.getItem('current_user');
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user && user.user_id === userId) {
          user.is_first_time_user = isFirstTimeUser;
          await AsyncStorage.setItem('current_user', JSON.stringify(user));
        }
      }
    } catch (storageError) {
      console.error('Error updating AsyncStorage:', storageError);
    }
    
    return data;
  } catch (error) {
    console.error('Exception in updateFirstTimeStatus:', error);
    return null;
  }
}

/**
 * Get user's wallet balance
 */
export async function getUserWalletBalance(userId: string): Promise<number> {
  try {
    console.log(`[WALLET] Fetching wallet balance for user: ${userId}`);
    
    const { data, error } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching wallet balance:', error);
      throw error;
    }
    
    return data.wallet_balance || 0;
  } catch (error) {
    console.error('Exception in getUserWalletBalance:', error);
    return 0;
  }
}

/**
 * Add funds to user's wallet
 */
export async function addToWallet(
  userId: string, 
  amount: number, 
  description = 'Wallet recharge'
): Promise<{ success: boolean, balance: number }> {
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }
  
  try {
    console.log(`[WALLET] Adding ${amount} to wallet for user: ${userId}`);
    
    // First add a wallet transaction
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        type: TransactionType.DEPOSIT,
        description: description
      });
    
    if (transactionError) {
      console.error('Error adding wallet transaction:', transactionError);
      throw transactionError;
    }
    
    // The trigger will handle updating the balance automatically
    
    // Get updated balance
    const newBalance = await getUserWalletBalance(userId);
    
    return { success: true, balance: newBalance };
  } catch (error) {
    console.error('Exception in addToWallet:', error);
    throw new Error('Failed to add funds to wallet');
  }
}

/**
 * Deduct funds from user's wallet
 */
export async function deductFromWallet(
  userId: string, 
  amount: number, 
  description = 'Booking payment', 
  reference?: string
): Promise<{ success: boolean, balance: number }> {
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }
  
  try {
    console.log(`[WALLET] Deducting ${amount} from wallet for user: ${userId}`);
    
    // Check if user has enough balance
    const currentBalance = await getUserWalletBalance(userId);
    
    if (currentBalance < amount) {
      console.error(`[WALLET] Insufficient funds: ${currentBalance} < ${amount}`);
      return { success: false, balance: currentBalance };
    }
    
    // Add transaction with negative amount
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        amount: -amount, // Negative amount for deduction
        type: TransactionType.BOOKING,
        description: description,
        reference: reference
      });
    
    if (transactionError) {
      console.error('Error adding deduction transaction:', transactionError);
      throw transactionError;
    }
    
    // The trigger will handle updating the balance automatically
    
    // Get updated balance
    const newBalance = await getUserWalletBalance(userId);
    
    return { success: true, balance: newBalance };
  } catch (error) {
    console.error('Exception in deductFromWallet:', error);
    throw new Error('Failed to deduct funds from wallet');
  }
}

/**
 * Process a refund to user's wallet
 */
export async function processRefund(
  userId: string, 
  amount: number, 
  description = 'Booking refund', 
  reference?: string
): Promise<{ success: boolean, balance: number }> {
  if (amount <= 0) {
    throw new Error('Refund amount must be greater than zero');
  }
  
  try {
    console.log(`[WALLET] Processing refund of ${amount} to wallet for user: ${userId}`);
    
    // Add refund transaction
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        type: TransactionType.REFUND,
        description: description,
        reference: reference
      });
    
    if (transactionError) {
      console.error('Error adding refund transaction:', transactionError);
      throw transactionError;
    }
    
    // The trigger will handle updating the balance automatically
    
    // Get updated balance
    const newBalance = await getUserWalletBalance(userId);
    
    return { success: true, balance: newBalance };
  } catch (error) {
    console.error('Exception in processRefund:', error);
    throw new Error('Failed to process refund to wallet');
  }
}

/**
 * Get wallet transactions for a user
 */
export async function getWalletTransactions(userId: string, limit = 20): Promise<WalletTransaction[]> {
  try {
    console.log(`[WALLET] Fetching wallet transactions for user: ${userId}, limit: ${limit}`);
    
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching wallet transactions:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception in getWalletTransactions:', error);
    return [];
  }
}

/**
 * Delete user account (for testing or admin purposes)
 */
export async function deleteUserAccount(userId: string): Promise<boolean> {
  try {
    console.log(`[USER] Deleting user account: ${userId}`);
    
    // First delete all wallet transactions
    const { error: transactionDeleteError } = await supabase
      .from('wallet_transactions')
      .delete()
      .eq('user_id', userId);
    
    if (transactionDeleteError) {
      console.error('Error deleting wallet transactions:', transactionDeleteError);
      throw transactionDeleteError;
    }
    
    // Then delete the user
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);
    
    if (userDeleteError) {
      console.error('Error deleting user account:', userDeleteError);
      throw userDeleteError;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in deleteUserAccount:', error);
    return false;
  }
}

/**
 * Maps a UUID format user ID to a PG-formatted ID
 * This is essential for database operations since the bookings table uses PG-formatted user_ids
 * @param userId The UUID or PG-formatted user ID
 * @returns A PG-formatted user ID that can be used with the bookings table
 */
export async function mapUUIDtoPgId(userId: string): Promise<string> {
  // If it's already a PG- or DEV- ID, return as is
  if (userId.startsWith('PG-') || userId.startsWith('DEV-')) {
    console.log(`[USER_SERVICE] ID ${userId} is already in PG/DEV format`);
    return userId;
  }
  
  // Check if it's a UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  
  if (!isUUID) {
    console.log(`[USER_SERVICE] ID ${userId} is not a UUID or PG-formatted ID, treating as-is`);
    return userId;
  }
  
  console.log(`[USER_SERVICE] Mapping UUID ${userId} to PG-formatted ID`);
  
  try {
    // We need to find the user record by UUID in users.id, then get its users.user_id
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('id', userId)
      .maybeSingle();
      
    if (!userError && userRecord && userRecord.user_id) {
      console.log(`[USER_SERVICE] Found PG-ID ${userRecord.user_id} for UUID ${userId}`);
      return userRecord.user_id;
    }
    
    // If we couldn't find by id, try to get any available user with a PG- formatted user_id
    const { data: pgUsers, error: pgUsersError } = await supabase
      .from('users')
      .select('user_id')
      .neq('user_id', null)
      .like('user_id', 'PG-%')
      .limit(1);
      
    if (!pgUsersError && pgUsers && pgUsers.length > 0 && pgUsers[0].user_id) {
      const pgId = pgUsers[0].user_id;
      console.log(`[USER_SERVICE] Using first available PG-ID ${pgId} for UUID ${userId}`);
      return pgId;
    }
    
    // If we get here, we couldn't find any PG-formatted ID
    console.error(`[USER_SERVICE] No PG-formatted user_ids available in the database`);
    return userId; // Return original as fallback
  } catch (error) {
    console.error(`[USER_SERVICE] Error mapping UUID to PG-ID:`, error);
    return userId; // Return original as fallback
  }
} 