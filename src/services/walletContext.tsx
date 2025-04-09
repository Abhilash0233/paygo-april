import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './authContext'; // Import our custom auth context
import { supabase } from '../config/supabaseConfig';

interface WalletContextType {
  walletBalance: number;
  isLoading: boolean;
  refreshWalletBalance: () => Promise<void>;
  forceRefreshWithId: (userId: string) => Promise<void>; // Add this for direct refreshing with a specific ID
}

const WalletContext = createContext<WalletContextType>({
  walletBalance: 0,
  isLoading: false,
  refreshWalletBalance: async () => {},
  forceRefreshWithId: async () => {},
});

export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user, isAuthenticated } = useAuth(); // Use our custom auth context

  // Add a debounce mechanism
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const REFRESH_COOLDOWN = 500; // ms

  // Add this helper function at the top of the component
  const fetchUserWalletFromSupabase = async (userId: string): Promise<number> => {
    try {
      console.log(`[WALLET] Fetching wallet balance for user ID: ${userId}`);
      
      // Check if this looks like a UUID
      const isUuid = userId.includes('-') && userId.length >= 36;
      
      // First attempt: If it looks like a UUID, try by id field first
      if (isUuid) {
        console.log(`[WALLET] ID appears to be a UUID, trying by id field first`);
        const { data, error } = await supabase
          .from('users')
          .select('wallet_balance')
          .eq('id', userId)
          .maybeSingle();
        
        if (!error && data) {
          console.log(`[WALLET] User wallet found by UUID, balance: ${data.wallet_balance}`);
          return Number(data.wallet_balance) || 0;
        }
      }
      
      // Second attempt: Try by user_id field
      console.log(`[WALLET] Trying to fetch wallet by user_id field`);
      const { data: userIdData, error: userIdError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!userIdError && userIdData) {
        console.log(`[WALLET] User wallet found by user_id, balance: ${userIdData.wallet_balance}`);
        return Number(userIdData.wallet_balance) || 0;
      }
      
      // Third attempt: If not UUID, try by id field as fallback
      if (!isUuid) {
        console.log(`[WALLET] ID wasn't found by user_id, trying by id field as fallback`);
        const { data: idData, error: idError } = await supabase
          .from('users')
          .select('wallet_balance')
          .eq('id', userId)
          .maybeSingle();
        
        if (!idError && idData) {
          console.log(`[WALLET] User wallet found by UUID in fallback, balance: ${idData.wallet_balance}`);
          return Number(idData.wallet_balance) || 0;
        }
      }
      
      // Final attempt: Try by phone number if the ID might be a phone number
      if (userId.includes('+') || /^\d{10,15}$/.test(userId)) {
        console.log(`[WALLET] ID might be a phone number, trying by phone_number field`);
        const phoneNumber = userId.startsWith('+') ? userId : `+${userId.replace(/^\+/, '')}`;
        
        const { data: phoneData, error: phoneError } = await supabase
          .from('users')
          .select('wallet_balance')
          .eq('phone_number', phoneNumber)
          .maybeSingle();
        
        if (!phoneError && phoneData) {
          console.log(`[WALLET] User wallet found by phone number, balance: ${phoneData.wallet_balance}`);
          return Number(phoneData.wallet_balance) || 0;
        }
      }
      
      console.log(`[WALLET] No wallet found in Supabase, returning 0`);
      return 0;
    } catch (error) {
      console.error('[WALLET] Error fetching wallet from Supabase:', error);
      return 0;
    }
  };

  const forceRefreshWithId = async (userId: string) => {
    if (!userId) {
      console.log('[WALLET] No user ID provided for refresh');
      setWalletBalance(0);
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`[WALLET] Force refreshing wallet balance with ID: ${userId}`);
      
      // Use the new helper function to fetch wallet balance
      const balance = await fetchUserWalletFromSupabase(userId);
      setWalletBalance(balance);
      console.log(`[WALLET] Successfully refreshed balance: ${balance}`);
    } catch (error) {
      console.error('[WALLET] Error fetching wallet balance:', error);
      setWalletBalance(0);
    } finally {
      setIsLoading(false);
    }
  };
  
  const refreshWalletBalance = async () => {
    setIsLoading(true);
    try {
      // Use our user ID from the custom auth context instead of Firebase Auth
      if (user && user.id) {
        console.log(`[WALLET] Refreshing wallet balance for user: ${user.id}`);
        const balance = await fetchUserWalletFromSupabase(user.id);
        setWalletBalance(balance);
        console.log(`[WALLET] Wallet balance updated: ${balance}`);
      } else {
        console.log('No user logged in, cannot fetch wallet balance');
        setWalletBalance(0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch of wallet balance
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshWalletBalance();
    } else {
      setWalletBalance(0);
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  return (
    <WalletContext.Provider
      value={{
        walletBalance,
        isLoading,
        refreshWalletBalance,
        forceRefreshWithId,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 