/**
 * Firebase to Supabase User Migration Script
 * This script migrates user profiles and wallet data from Firebase to Supabase
 * 
 * Usage:
 * 1. Make sure you have both Firebase and Supabase credentials set up
 * 2. Run: node src/scripts/firebase-to-supabase-migration.js
 */

const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');
require('dotenv').config();

// Firebase setup - provide the path to your service account key JSON file
const serviceAccount = require('../../firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://qzbuzimlrhcchgnldnrv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Generate a short user ID similar to the one in the app
function generateShortUserId(phoneNumber) {
  if (!phoneNumber || phoneNumber.trim() === '') {
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PG-${randomDigits}-${randomChars}`;
  }
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  const lastDigits = cleaned.length > 0 ? cleaned.slice(-4) : '0000';
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `PG-${lastDigits}-${randomChars}`;
}

// Format dates from Firebase to ISO string
function formatDate(firestoreTimestamp) {
  if (!firestoreTimestamp) return new Date().toISOString();
  
  if (firestoreTimestamp._seconds) {
    return new Date(firestoreTimestamp._seconds * 1000).toISOString();
  }
  
  if (firestoreTimestamp.seconds) {
    return new Date(firestoreTimestamp.seconds * 1000).toISOString();
  }
  
  return new Date().toISOString();
}

// Map Firebase user profile to Supabase user schema
function mapUserProfileToSupabase(firebaseUser, wallet) {
  try {
    // Generate a unique user_id if not already in the PG-XXXX-XXXX format
    let userId = firebaseUser.id;
    if (!userId.startsWith('PG-')) {
      userId = generateShortUserId(firebaseUser.phoneNumber);
    }
    
    return {
      id: randomUUID(), // New UUID for Supabase using the imported randomUUID function
      user_id: userId,
      phone_number: firebaseUser.phoneNumber || '',
      display_name: firebaseUser.displayName || '',
      email: firebaseUser.email || null,
      photo_url: firebaseUser.photoURL || null,
      whatsapp_enabled: firebaseUser.whatsappEnabled || false,
      profile_complete: firebaseUser.profileComplete || false,
      email_verified: firebaseUser.emailVerified || false,
      notifications_enabled: firebaseUser.notificationsEnabled || true,
      is_first_time_user: firebaseUser.isFirstTimeUser || false,
      login_count: firebaseUser.loginCount || 1,
      username: firebaseUser.username || firebaseUser.displayName || '',
      device_info: firebaseUser.deviceInfo || '',
      
      // Wallet fields
      wallet_balance: (wallet && wallet.balance) || 0,
      wallet_created_at: wallet ? formatDate(wallet.createdAt) : null,
      
      // Timestamps
      created_at: formatDate(firebaseUser.createdAt),
      last_login: formatDate(firebaseUser.lastLogin),
      last_updated: formatDate(firebaseUser.lastUpdated)
    };
  } catch (error) {
    console.error(`Error mapping user ${firebaseUser.id}:`, error);
    throw error;
  }
}

// Map wallet transactions from Firebase to Supabase
function mapWalletTransactionToSupabase(firebaseTx, userId) {
  return {
    id: randomUUID(), // New UUID for Supabase using the imported randomUUID function
    user_id: userId,
    amount: firebaseTx.amount || 0,
    type: firebaseTx.type || 'deposit',
    description: firebaseTx.description || '',
    reference: firebaseTx.reference || null,
    created_at: formatDate(firebaseTx.timestamp)
  };
}

// Main migration function
async function migrateUsers() {
  console.log('Starting user migration from Firebase to Supabase...');
  let migratedCount = 0;
  let errorCount = 0;
  
  try {
    // Step 1: Get all users from Firebase
    console.log('Fetching users from Firebase...');
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    console.log(`Found ${totalUsers} users in Firebase`);
    
    // Step 2: Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        userData.id = userDoc.id;
        console.log(`Processing user: ${userData.id} (${userData.phoneNumber || 'no phone'})`);
        
        // Step 3: Get user's wallet from Firebase
        let wallet = null;
        try {
          const walletDoc = await db.collection('wallets').doc(userData.id).get();
          if (walletDoc.exists) {
            wallet = walletDoc.data();
            console.log(`Found wallet for user ${userData.id} with balance: ${wallet.balance || 0}`);
          } else {
            console.log(`No wallet found for user ${userData.id}`);
          }
        } catch (walletError) {
          console.error(`Error fetching wallet for user ${userData.id}:`, walletError);
        }
        
        // Step 4: Map the user profile to Supabase schema
        const supabaseUser = mapUserProfileToSupabase(userData, wallet);
        
        // Step 5: Insert the user into Supabase
        const { data: insertedUser, error: userError } = await supabase
          .from('users')
          .upsert(supabaseUser)
          .select()
          .single();
        
        if (userError) {
          console.error(`Error inserting user ${userData.id}:`, userError);
          errorCount++;
          continue;
        }
        
        console.log(`User ${userData.id} migrated successfully to Supabase`);
        
        // Step 6: Get user's wallet transactions from Firebase
        let transactionsMigrated = 0;
        try {
          const transactionsSnapshot = await db.collection('wallet_transactions')
            .where('userId', '==', userData.id)
            .get();
          
          if (!transactionsSnapshot.empty) {
            console.log(`Found ${transactionsSnapshot.size} wallet transactions for user ${userData.id}`);
            
            const transactions = [];
            
            for (const txDoc of transactionsSnapshot.docs) {
              const txData = txDoc.data();
              const supabaseTx = mapWalletTransactionToSupabase(txData, supabaseUser.user_id);
              transactions.push(supabaseTx);
            }
            
            // Insert transactions in batches of 100
            const batchSize = 100;
            for (let i = 0; i < transactions.length; i += batchSize) {
              const batch = transactions.slice(i, i + batchSize);
              const { error: txError } = await supabase
                .from('wallet_transactions')
                .upsert(batch);
              
              if (txError) {
                console.error(`Error inserting transactions batch for user ${userData.id}:`, txError);
              } else {
                transactionsMigrated += batch.length;
              }
            }
            
            console.log(`Migrated ${transactionsMigrated} transactions for user ${userData.id}`);
          } else {
            console.log(`No wallet transactions found for user ${userData.id}`);
          }
        } catch (txError) {
          console.error(`Error fetching/migrating transactions for user ${userData.id}:`, txError);
        }
        
        migratedCount++;
        console.log(`Progress: ${migratedCount}/${totalUsers} users migrated`);
      } catch (userError) {
        console.error(`Error processing user:`, userError);
        errorCount++;
      }
    }
    
    console.log('\n--- Migration Summary ---');
    console.log(`Total users in Firebase: ${totalUsers}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Failed to migrate: ${errorCount}`);
    console.log('Migration complete!');
    
  } catch (error) {
    console.error('Fatal error during migration:', error);
  }
}

// Check if we have the required environment variables
if (!supabaseServiceKey) {
  console.error('Error: Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log('Make sure to set the required environment variables before running this script');
  process.exit(1);
}

// Execute the migration
migrateUsers().catch(error => {
  console.error('Unhandled error during migration:', error);
  process.exit(1);
}); 