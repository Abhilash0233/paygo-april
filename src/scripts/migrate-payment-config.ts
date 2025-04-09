/**
 * Migration script to transfer payment configuration from Firebase to Supabase
 * 
 * Run with: npx ts-node src/scripts/migrate-payment-config.ts
 */

import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../services/firebase/firebase';
import { supabase } from '../services/supabase/supabaseClient';
import { logger } from '../utils/logger';

interface FirebasePaymentConfig {
  isLiveMode: boolean;
  lastUpdated?: string;
  updatedBy?: string;
}

interface SupabasePaymentConfig {
  is_live_mode: boolean;
  last_updated: string;
  updated_by: string;
}

async function migratePaymentConfig() {
  try {
    logger.info('Starting payment configuration migration from Firebase to Supabase');
    
    // 1. Get the configuration from Firebase
    const configRef = doc(firestore, 'app_config', 'payment_gateway');
    const configSnap = await getDoc(configRef);
    
    if (!configSnap.exists()) {
      logger.warn('No payment configuration found in Firebase. Creating default config in Supabase.');
      // Create default config in Supabase (test mode)
      const defaultConfig: SupabasePaymentConfig = {
        is_live_mode: false,
        last_updated: new Date().toISOString(),
        updated_by: 'system_migration'
      };
      
      await insertConfigToSupabase(defaultConfig);
      return;
    }
    
    const firebaseConfig = configSnap.data() as FirebasePaymentConfig;
    logger.info('Retrieved Firebase payment config:', { isLiveMode: firebaseConfig.isLiveMode });
    
    // 2. Transform data to Supabase format
    const supabaseConfig: SupabasePaymentConfig = {
      is_live_mode: firebaseConfig.isLiveMode,
      last_updated: firebaseConfig.lastUpdated || new Date().toISOString(),
      updated_by: firebaseConfig.updatedBy || 'system_migration'
    };
    
    // 3. Insert or update in Supabase
    await insertConfigToSupabase(supabaseConfig);
    
    logger.info('Payment configuration successfully migrated to Supabase');
  } catch (error) {
    logger.error('Error migrating payment configuration:', error);
    throw error;
  }
}

async function insertConfigToSupabase(config: SupabasePaymentConfig) {
  // Check if config already exists in Supabase
  const { data: existingConfig, error: fetchError } = await supabase
    .from('payment_config')
    .select('*')
    .limit(1);
    
  if (fetchError) {
    throw new Error(`Error checking existing Supabase config: ${fetchError.message}`);
  }
  
  if (existingConfig && existingConfig.length > 0) {
    // Update existing record
    const { error: updateError } = await supabase
      .from('payment_config')
      .update(config)
      .eq('id', existingConfig[0].id);
      
    if (updateError) {
      throw new Error(`Error updating Supabase config: ${updateError.message}`);
    }
    
    logger.info('Updated existing payment configuration in Supabase');
  } else {
    // Insert new record
    const { error: insertError } = await supabase
      .from('payment_config')
      .insert(config);
      
    if (insertError) {
      throw new Error(`Error inserting Supabase config: ${insertError.message}`);
    }
    
    logger.info('Inserted new payment configuration into Supabase');
  }
}

// Execute the migration
migratePaymentConfig()
  .then(() => {
    logger.info('Payment configuration migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Payment configuration migration failed:', error);
    process.exit(1);
  }); 