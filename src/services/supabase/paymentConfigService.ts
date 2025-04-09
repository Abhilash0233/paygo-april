import { supabase } from '../../config/supabaseConfig';

// Default keys - using the same keys as in the Firebase implementation
const TEST_KEY = 'rzp_test_zvsuznbh17NgF4';
const LIVE_KEY = 'rzp_live_vjyxlidpD8nH08';

// Define the table name for payment configuration
const PAYMENT_CONFIG_TABLE = 'payment_config';

export interface PaymentConfig {
  id: string;
  is_live_mode: boolean;
  last_updated: string;
  updated_by: string;
}

/**
 * Retrieves the current payment configuration from Supabase
 * @returns The payment configuration or null if not found
 */
export async function getPaymentConfig(): Promise<PaymentConfig | null> {
  try {
    const { data, error } = await supabase
      .from('payment_config')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching payment config:', error);
      return null;
    }

    return data as PaymentConfig;
  } catch (error) {
    console.error('Unexpected error fetching payment config:', error);
    return null;
  }
}

/**
 * Updates the payment configuration mode (test/live)
 * @param isLiveMode - Whether the payment system should operate in live mode
 * @param userId - The ID of the user performing the update
 * @returns Boolean indicating success
 */
export async function updatePaymentMode(
  isLiveMode: boolean,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_config')
      .update({
        is_live_mode: isLiveMode,
        last_updated: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', (await getPaymentConfig())?.id || '');

    if (error) {
      console.error('Error updating payment mode:', error);
      return false;
    }

    console.log(`Payment mode updated to ${isLiveMode ? 'LIVE' : 'TEST'}`);
    return true;
  } catch (error) {
    console.error('Unexpected error updating payment mode:', error);
    return false;
  }
}

/**
 * Checks if the payment gateway is configured in live mode
 * @returns Boolean indicating if live mode is enabled
 */
export async function isLiveModeEnabled(): Promise<boolean> {
  try {
    const config = await getPaymentConfig();
    return config?.is_live_mode || false;
  } catch (error) {
    console.error('Error checking payment mode:', error);
    return false; // Default to test mode for safety
  }
}

/**
 * Gets the appropriate Razorpay key based on the current configuration
 * @returns The Razorpay API key to use
 */
export async function getRazorpayKey(): Promise<string> {
  try {
    console.log('[PAYMENT_CONFIG] Getting Razorpay key');
    const config = await getPaymentConfig();
    const key = config?.is_live_mode ? LIVE_KEY : TEST_KEY;
    console.log('[PAYMENT_CONFIG] Using', config?.is_live_mode ? 'LIVE' : 'TEST', 'key');
    return key;
  } catch (error) {
    console.error('[PAYMENT_CONFIG] Error getting Razorpay key:', error);
    console.log('[PAYMENT_CONFIG] Falling back to TEST key');
    // Return test key as fallback
    return TEST_KEY;
  }
}

/**
 * Checks if the current user has admin privileges to modify payment settings
 * @param userId The ID of the user to check
 * @returns Boolean indicating whether the user is an admin
 */
export async function isPaymentAdmin(userId: string): Promise<boolean> {
  try {
    if (!userId) return false;
    
    // Check if user is an admin based on admin_users table
    const { data, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      console.log('[PAYMENT_CONFIG] User not found in admin_users table');
      return false;
    }
    
    // Check if the user has the correct admin role
    const isAdmin = data.role === 'admin' || data.role === 'super_admin';
    console.log('[PAYMENT_CONFIG] User admin status:', isAdmin);
    return isAdmin;
  } catch (error) {
    console.error('[PAYMENT_CONFIG] Error checking admin status:', error);
    return false;
  }
} 