import { db } from '../firebase/config';
import { doc, getDoc, collection, setDoc } from 'firebase/firestore';

// Default keys
const TEST_KEY = 'rzp_test_zvsuznbh17NgF4';
const LIVE_KEY = 'rzp_live_vjyxlidpD8nH08';

interface PaymentConfig {
  isLiveMode: boolean;
  lastUpdated: string;
  updatedBy: string;
}

// Collection name for payment configuration
const PAYMENT_CONFIG_COLLECTION = 'payment_config';

export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    console.log('[PAYMENT_CONFIG] Fetching payment configuration from Firestore');
    const configDoc = await getDoc(doc(db, PAYMENT_CONFIG_COLLECTION, 'environment'));
    
    if (configDoc.exists()) {
      const config = configDoc.data() as PaymentConfig;
      console.log('[PAYMENT_CONFIG] Configuration found:', {
        isLiveMode: config.isLiveMode,
        lastUpdated: config.lastUpdated,
        updatedBy: config.updatedBy
      });
      return config;
    }
    
    console.log('[PAYMENT_CONFIG] No configuration found, creating default config (test mode)');
    // If no config exists, create default config (test mode)
    const defaultConfig: PaymentConfig = {
      isLiveMode: false,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system'
    };
    
    await setDoc(doc(db, PAYMENT_CONFIG_COLLECTION, 'environment'), defaultConfig);
    return defaultConfig;
  } catch (error) {
    console.error('[PAYMENT_CONFIG] Error getting payment config:', error);
    // Return test mode as fallback
    return {
      isLiveMode: false,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system'
    };
  }
}

export async function updatePaymentConfig(isLiveMode: boolean, updatedBy: string): Promise<void> {
  try {
    console.log('[PAYMENT_CONFIG] Updating payment configuration:', { isLiveMode, updatedBy });
    const config: PaymentConfig = {
      isLiveMode,
      lastUpdated: new Date().toISOString(),
      updatedBy
    };
    
    await setDoc(doc(db, PAYMENT_CONFIG_COLLECTION, 'environment'), config);
    console.log('[PAYMENT_CONFIG] Configuration updated successfully');
  } catch (error) {
    console.error('[PAYMENT_CONFIG] Error updating payment config:', error);
    throw error;
  }
}

export async function getRazorpayKey(): Promise<string> {
  try {
    console.log('[PAYMENT_CONFIG] Getting Razorpay key');
    const config = await getPaymentConfig();
    const key = config.isLiveMode ? LIVE_KEY : TEST_KEY;
    console.log('[PAYMENT_CONFIG] Using', config.isLiveMode ? 'LIVE' : 'TEST', 'key');
    return key;
  } catch (error) {
    console.error('[PAYMENT_CONFIG] Error getting Razorpay key:', error);
    console.log('[PAYMENT_CONFIG] Falling back to TEST key');
    // Return test key as fallback
    return TEST_KEY;
  }
} 