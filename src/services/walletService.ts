import { supabase, getServiceRoleClient } from '../config/supabaseConfig';
import { UserProfile, TransactionType, WalletTransaction, mapUUIDtoPgId } from './supabase/userService';

/**
 * Helper function to get the correct PG formatted ID if needed
 */
async function getProperUserId(userId: string): Promise<string> {
  try {
    // Use the centralized mapping function in userService
    return await mapUUIDtoPgId(userId);
  } catch (error) {
    console.error('[WALLET] Exception in getProperUserId:', error);
    return userId; // Return original on exception
  }
}

/**
 * Get user's wallet balance
 */
export async function getUserWalletBalance(
  userId: string
): Promise<number> {
  try {
    // Get the proper PG-formatted ID if needed
    const properUserId = await getProperUserId(userId);
    console.log(`[WALLET] Getting wallet balance for user: ${properUserId} (original: ${userId})`);
    
    // Get service role client for admin-level access
    const serviceClient = getServiceRoleClient();
    if (!serviceClient) {
      console.error('[WALLET] Service role client not available.');
      return 0;
    }
    
    // Get current balance
    const { data, error } = await serviceClient
      .from('users')
      .select('wallet_balance')
      .eq('id', properUserId)
      .maybeSingle();
    
    if (error) {
      console.error('[WALLET] Error fetching wallet balance:', error);
      return 0;
    }
    
    const balance = data?.wallet_balance || 0;
    console.log(`[WALLET] Retrieved wallet balance: ₹${balance}`);
    
    return balance;
  } catch (error) {
    console.error('[WALLET] Exception in getUserWalletBalance:', error);
    return 0;
  }
}

/**
 * Add money to a user's wallet
 */
export async function addToWallet(
  userId: string,
  amount: number,
  referenceId: string,
  description = 'Wallet recharge'
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  try {
    // Get the proper PG-formatted ID if needed
    const properUserId = await getProperUserId(userId);
    console.log(`[WALLET] Adding ₹${amount} to wallet for user: ${properUserId} (original: ${userId})`);
    
    // Get service role client for admin-level access
    const serviceClient = getServiceRoleClient();
    if (!serviceClient) {
      return { success: false, error: 'Service role client not available.' };
    }
    
    // Get existing wallet balance
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('wallet_balance')
      .eq('id', properUserId)
      .maybeSingle();
    
    if (userError) {
      console.error('[WALLET] Error getting user wallet:', userError);
      return { success: false, error: 'Failed to retrieve wallet balance.' };
    }
    
    // Calculate new balance
    const currentBalance = userData?.wallet_balance || 0;
    const newBalance = currentBalance + amount;
    
    console.log(`[WALLET] Current balance: ₹${currentBalance}, New balance: ₹${newBalance}`);
    
    // Begin transaction
    // First update wallet balance
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        wallet_balance: newBalance,
      })
      .eq('id', properUserId);
    
    if (updateError) {
      console.error('[WALLET] Error updating wallet balance:', updateError);
      return { success: false, error: 'Failed to update wallet balance.' };
    }
    
    // Then record the transaction
    const { data: transactionData, error: transactionError } = await serviceClient
      .from('wallet_transactions')
      .insert({
        user_id: properUserId,
        amount: amount,
        type: TransactionType.DEPOSIT,
        description: description,
        reference: referenceId,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    
    if (transactionError) {
      console.error('[WALLET] Error recording transaction:', transactionError);
      // Even if transaction recording fails, wallet has been updated
      return { 
        success: true, 
        error: 'Wallet updated but transaction could not be recorded.' 
      };
    }
    
    return {
      success: true,
      transactionId: transactionData.id
    };
  } catch (error) {
    console.error('[WALLET] Exception in addToWallet:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Deduct money from a user's wallet
 */
export async function deductFromWallet(
  userId: string,
  amount: number,
  referenceId: string,
  description = 'Booking payment'
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  try {
    // Get the proper PG-formatted ID if needed
    const properUserId = await getProperUserId(userId);
    console.log(`[WALLET] Deducting ₹${amount} from wallet for user: ${properUserId} (original: ${userId})`);
    
    // Get service role client for admin-level access
    const serviceClient = getServiceRoleClient();
    if (!serviceClient) {
      return { success: false, error: 'Service role client not available.' };
    }
    
    // Get existing wallet balance
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('wallet_balance')
      .eq('id', properUserId)
      .maybeSingle();
    
    if (userError) {
      console.error('[WALLET] Error getting user wallet:', userError);
      return { success: false, error: 'Failed to retrieve wallet balance.' };
    }
    
    // Calculate new balance
    const currentBalance = userData?.wallet_balance || 0;
    
    // Check if user has sufficient balance
    if (currentBalance < amount) {
      console.error('[WALLET] Insufficient wallet balance. Have:', currentBalance, 'Need:', amount);
      return { success: false, error: 'Insufficient wallet balance.' };
    }
    
    const newBalance = currentBalance - amount;
    console.log(`[WALLET] Current balance: ₹${currentBalance}, New balance: ₹${newBalance}`);
    
    // Begin transaction
    // First update wallet balance
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        wallet_balance: newBalance,
      })
      .eq('id', properUserId);
    
    if (updateError) {
      console.error('[WALLET] Error updating wallet balance:', updateError);
      return { success: false, error: 'Failed to update wallet balance.' };
    }
    
    // Then record the transaction
    const { data: transactionData, error: transactionError } = await serviceClient
      .from('wallet_transactions')
      .insert({
        user_id: properUserId,
        amount: amount,
        type: TransactionType.BOOKING,
        description: description,
        reference: referenceId,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    
    if (transactionError) {
      console.error('[WALLET] Error recording transaction:', transactionError);
      // Even if transaction recording fails, wallet has been updated
      return { 
        success: true, 
        error: 'Wallet updated but transaction could not be recorded.' 
      };
    }
    
    return {
      success: true,
      transactionId: transactionData.id
    };
  } catch (error) {
    console.error('[WALLET] Exception in deductFromWallet:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Get wallet transactions for a user
 */
export async function getWalletTransactions(
  userId: string,
  limit = 50
): Promise<WalletTransaction[]> {
  try {
    // Get the proper PG-formatted ID if needed
    const properUserId = await getProperUserId(userId);
    console.log(`[WALLET] Getting wallet transactions for user: ${properUserId} (original: ${userId})`);
    
    // Try with regular client first
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', properUserId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // If there's a permission error, try with service role client
    if (error && error.code === '42501') {
      console.log('[WALLET] Permission denied, using service role client instead');
      const serviceClient = getServiceRoleClient();
      
      if (!serviceClient) {
        console.error('[WALLET] Service role client not available');
        return [];
      }
      
      const { data: serviceData, error: serviceError } = await serviceClient
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', properUserId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (serviceError) {
        console.error('[WALLET] Error fetching wallet transactions with service role:', serviceError);
        return [];
      }
      
      return serviceData as WalletTransaction[];
    }
    
    if (error) {
      console.error('[WALLET] Error fetching wallet transactions:', error);
      return [];
    }
    
    return data as WalletTransaction[];
  } catch (error) {
    console.error('[WALLET] Exception in getWalletTransactions:', error);
    return [];
  }
}

/**
 * Force repair a user's wallet balance by recalculating from transactions
 * This is useful if the balance gets out of sync
 */
export async function forceRepairSpecificWallet(
  userId: string
): Promise<{ success: boolean; previousBalance?: number; newBalance?: number; error?: string }> {
  try {
    console.log(`[WALLET] Force repairing wallet for user: ${userId}`);
    
    // Get a service role client to ensure we have sufficient permissions
    const serviceClient = getServiceRoleClient();
    if (!serviceClient) {
      return { success: false, error: 'Service role client not available.' };
    }
    
    // First, get all transactions for this user
    const { data: transactions, error: txError } = await serviceClient
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId);
    
    if (txError) {
      console.error('[WALLET] Error fetching transactions for repair:', txError);
      return { success: false, error: 'Failed to fetch transaction history.' };
    }
    
    // Get current balance for comparison
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) {
      console.error('[WALLET] Error getting current wallet balance:', userError);
      return { success: false, error: 'Failed to retrieve current wallet balance.' };
    }
    
    const previousBalance = userData?.wallet_balance || 0;
    
    // Calculate the correct balance from transactions
    let calculatedBalance = 0;
    
    if (transactions && transactions.length > 0) {
      // Sort transactions by date
      const sortedTransactions = [...transactions].sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      // Calculate balance by playing transactions in sequence
      for (const tx of sortedTransactions) {
        if (tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.REFUND) {
          calculatedBalance += tx.amount;
        } else if (tx.type === TransactionType.BOOKING) {
          calculatedBalance -= tx.amount;
        }
      }
    }
    
    console.log(`[WALLET] Calculated balance from transactions: ₹${calculatedBalance}`);
    console.log(`[WALLET] Current stored balance: ₹${previousBalance}`);
    
    if (calculatedBalance === previousBalance) {
      console.log('[WALLET] Wallet balance is already correct, no update needed');
      return { 
        success: true, 
        previousBalance,
        newBalance: previousBalance
      };
    }
    
    // Update the wallet with the correct balance
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        wallet_balance: calculatedBalance,
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('[WALLET] Error updating wallet with correct balance:', updateError);
      return { success: false, error: 'Failed to update wallet with correct balance.' };
    }
    
    console.log(`[WALLET] Wallet repaired. Previous: ₹${previousBalance}, New: ₹${calculatedBalance}`);
    
    return {
      success: true,
      previousBalance,
      newBalance: calculatedBalance
    };
  } catch (error) {
    console.error('[WALLET] Exception in forceRepairSpecificWallet:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
} 