import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { initiateRazorpayPayment } from '../../services/razorpayService';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import AppHeader from '../../components/AppHeader';

// Wallet service
import { addToWallet, getUserWalletBalance } from '../../services/walletService';
import { useAuth } from '../../services/authContext';

// Types
import { RootStackParamList } from '../../navigation/AppNavigator';
import RazorpayWebView from '../../components/RazorpayWebView';

type WalletRechargeNavigationProp = StackNavigationProp<RootStackParamList, 'WalletRecharge'>;
type WalletRechargeRouteProp = RouteProp<RootStackParamList, 'WalletRecharge'>;

// Predefined recharge amounts - make sure they're all above minimum
const RECHARGE_AMOUNTS = [250, 500, 1000, 2000, 5000];
const MINIMUM_RECHARGE_AMOUNT = 250;

export default function WalletRechargeScreen() {
  const navigation = useNavigation<WalletRechargeNavigationProp>();
  const route = useRoute<WalletRechargeRouteProp>();
  const { user: contextUser } = useAuth(); // Get user from auth context
  
  // Get required amount from params if available
  const requiredAmount = route.params?.requiredAmount || 0;
  const returnScreen = route.params?.returnScreen || '';
  const returnParams = route.params?.returnParams || {};
  
  // State
  const [selectedAmount, setSelectedAmount] = useState<number | null>(
    requiredAmount > 0 ? requiredAmount : null
  );
  const [customAmount, setCustomAmount] = useState<string>(
    requiredAmount > 0 ? requiredAmount.toString() : ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [showRazorpayWebView, setShowRazorpayWebView] = useState(false);
  const [razorpayHtmlContent, setRazorpayHtmlContent] = useState<string>('');

  const theme = useTheme();

  // Move styles inside component to access theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollContainer: {
      flex: 1,
    },
    balanceContainer: {
      padding: 24,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[100],
    },
    balanceLabel: {
      fontSize: 14,
      color: theme.colors.gray[600],
      marginBottom: 8,
      fontWeight: '500',
    },
    balanceAmount: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    requiredAmountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.secondary,
      padding: 12,
      marginHorizontal: 16,
      marginVertical: 16,
      borderRadius: 8,
    },
    infoIconContainer: {
      marginRight: 8,
    },
    requiredAmountText: {
      fontSize: 14,
      color: theme.colors.gray[800],
      flex: 1,
    },
    highlightText: {
      fontWeight: '600',
      color: theme.colors.primary,
    },
    sectionContainer: {
      padding: 16,
      backgroundColor: theme.colors.background,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.gray[50],
      borderRadius: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    errorInputContainer: {
      borderColor: theme.colors.error,
      backgroundColor: '#FFF5F5',
    },
    currencySymbol: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: '500',
      color: theme.colors.text,
      paddingVertical: 16,
      minHeight: 64,
    },
    inputErrorText: {
      fontSize: 12,
      color: theme.colors.error,
      fontWeight: '500',
      marginLeft: 8,
    },
    quickAmountsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    quickAmountButton: {
      flex: 1,
      minWidth: '30%',
      backgroundColor: theme.colors.gray[50],
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedQuickAmount: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.primary,
    },
    quickAmountText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    selectedQuickAmountText: {
      color: theme.colors.primary,
    },
    bottomBar: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: Platform.OS === 'ios' ? 20 : 12, // Extra padding for iOS
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[100],
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalContainer: {
      flex: 1,
    },
    totalLabel: {
      fontSize: 14,
      color: theme.colors.gray[600],
      marginBottom: 4,
    },
    totalAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    buttonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.gray[50],
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginRight: 8,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    payButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    payButtonText: {
      color: theme.colors.white,
      fontSize: 15,
      fontWeight: '600',
    },
    disabledButton: {
      backgroundColor: theme.colors.gray[300],
    },
    minAmountNote: {
      fontSize: 12,
      color: theme.colors.gray[600],
      marginTop: 8,
      fontStyle: 'italic',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
    },
    loadingText: {
      marginLeft: 8,
      fontSize: 14,
      color: theme.colors.gray[600],
      fontWeight: '500',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.error,
      fontWeight: '500',
    },
    retryButton: {
      marginLeft: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.gray[50],
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    retryText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    insufficientAmountOption: {
      backgroundColor: theme.colors.gray[50],
      borderColor: theme.colors.gray[300],
      opacity: 0.7,
    },
    insufficientAmountText: {
      color: theme.colors.gray[500],
    },
    insufficientLabel: {
      fontSize: 11,
      color: theme.colors.gray[500],
      marginTop: 4,
      fontWeight: '500',
    },
    quickAmountsTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.gray[600],
      marginBottom: 12,
    },
    razorpayInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.secondary,
      padding: 16,
      borderRadius: 12,
    },
    razorpayTextContainer: {
      flex: 1,
      marginLeft: 12,
    },
    razorpayTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    razorpayDescription: {
      fontSize: 14,
      color: theme.colors.gray[600],
      lineHeight: 20,
    },
  });

  // Fetch current wallet balance
  const fetchWalletBalance = useCallback(async () => {
    setIsBalanceLoading(true);
    setBalanceError(null);
    
    try {
      if (!contextUser?.id) {
        throw new Error('No user ID available');
      }
      
      console.log(`[WALLET] Fetching balance using context user ID: ${contextUser.id}`);
      const balance = await getUserWalletBalance(contextUser.id);
      setWalletBalance(balance);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setBalanceError('Failed to fetch balance');
      setWalletBalance(0);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [contextUser]);
  
  // Fetch wallet balance on mount and when context user changes
  useEffect(() => {
    fetchWalletBalance();
  }, [fetchWalletBalance]);

  // Handle amount selection
  const handleAmountSelect = (amount: number) => {
    setAmountError(null);
    setSelectedAmount(amount);
    setCustomAmount(amount.toString());
  };

  // Handle custom amount input
  const handleCustomAmountChange = (value: string) => {
    setAmountError(null);
    // Only allow numeric input
    if (/^\d*$/.test(value)) {
      setCustomAmount(value);
      setSelectedAmount(value ? parseInt(value, 10) : null);
    }
  };

  // Validate amount before proceeding
  const validateAmount = (amount: number): boolean => {
    if (amount < MINIMUM_RECHARGE_AMOUNT) {
      setAmountError(`Minimum recharge amount is ₹${MINIMUM_RECHARGE_AMOUNT}`);
      return false;
    }
    return true;
  };

  // Handle recharge with Razorpay
  const handleRecharge = async () => {
    if (!selectedAmount || selectedAmount <= 0) {
      setAmountError('Please select or enter a valid amount');
      return;
    }

    // Validate minimum amount
    if (!validateAmount(selectedAmount)) {
      return;
    }
    
    if (!contextUser?.id) {
      Alert.alert('Error', 'You need to be logged in to recharge your wallet');
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Auth'
        })
      );
      return;
    }
    
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      console.log(`[WALLET] Processing recharge of ₹${selectedAmount} for user ${contextUser.id}`);
      
      // Initiate Razorpay payment with minimal required options
      const paymentResult = await initiateRazorpayPayment({
        amount: selectedAmount,
        currency: 'INR',
        name: 'PayGo Wallet',
        description: `Wallet Recharge - ₹${selectedAmount}`,
        notes: {
          userId: contextUser.id,
          type: 'wallet_recharge'
        }
      });

      if (!paymentResult.success || !paymentResult.htmlContent) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      // Show Razorpay WebView
      setRazorpayHtmlContent(paymentResult.htmlContent);
      setShowRazorpayWebView(true);
      
    } catch (error) {
      console.error('Recharge error:', error);
      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'Failed to process payment'
      );
      setIsProcessing(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      console.log(`[WALLET_RECHARGE] Payment success with ID: ${paymentId}`);
      
      if (!contextUser?.id) {
        throw new Error('User not found');
      }
      
      console.log(`[WALLET_RECHARGE] Adding ${selectedAmount} to wallet for user ${contextUser.id}`);
      // Add to wallet using the determined user ID
      const result = await addToWallet(
        contextUser.id, 
        selectedAmount || 0, 
        paymentId, 
        `Wallet recharge - Razorpay: ${paymentId}`
      );
      
      if (result.success) {
        console.log(`[WALLET_RECHARGE] Successfully added to wallet. New transaction ID: ${result.transactionId}`);
        // Refresh the wallet balance
        console.log('[WALLET_RECHARGE] Refreshing wallet balance');
        await fetchWalletBalance();
        
        // Handle navigation first, then show success message
        if (returnScreen === 'BookingPreview' && returnParams) {
          console.log('[WALLET_RECHARGE] Navigating back to BookingPreview with reset');
          // Use CommonActions.reset to avoid stack build-up and prevent double refreshes
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                { 
                  name: 'BookingPreview',
                  params: {
                    ...returnParams,  // Preserve all original parameters
                    walletBalance: walletBalance, // Use the updated balance from state
                    returnFromRecharge: true
                  }
                }
              ],
            })
          );
        } else if (returnScreen) {
          console.log(`[WALLET_RECHARGE] Navigating to ${returnScreen}`);
          // For other screens, use navigate
          navigation.navigate(returnScreen as any, returnParams);
        } else {
          console.log('[WALLET_RECHARGE] Navigating back');
          // Navigate back to wallet or home screen
          navigation.goBack();
        }

        // Show success message after navigation
        Alert.alert(
          'Recharge Successful',
          `₹${selectedAmount} has been added to your wallet.`
        );
      } else {
        console.error('[WALLET_RECHARGE] Failed to add to wallet:', result);
        Alert.alert('Error', 'Failed to recharge wallet');
      }
    } catch (error) {
      console.error('[WALLET_RECHARGE] Wallet recharge error:', error);
      Alert.alert('Error', 'Failed to process wallet recharge');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    Alert.alert('Payment Failed', error);
    setIsProcessing(false);
  };

  // Handle back navigation
  const handleBackPress = () => {
    if (returnScreen && returnScreen !== '') {
      // Navigate back to the return screen with params if available
      navigation.navigate(returnScreen as any, returnParams);
    } else {
      // Otherwise just go back
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      {/* Fixed header with back button */}
      <AppHeader 
        title="Add Money"
        showBackButton={true}
        onBackPress={handleBackPress}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView style={styles.scrollContainer}>
          {/* Wallet Balance */}
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            {isBalanceLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#118347" />
                <Text style={styles.loadingText}>Fetching balance...</Text>
              </View>
            ) : balanceError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{balanceError}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={fetchWalletBalance}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.balanceAmount}>₹{walletBalance}</Text>
            )}
          </View>
          
          {/* Required Amount (if provided) */}
          {requiredAmount > 0 && (
            <View style={styles.requiredAmountContainer}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="information-circle" size={20} color="#118347" />
              </View>
              <Text style={styles.requiredAmountText}>
                Minimum required: <Text style={styles.highlightText}>₹{requiredAmount}</Text>
              </Text>
            </View>
          )}
          
          {/* Recharge Amount Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Enter Amount</Text>
            
            <View style={[
              styles.amountInputContainer,
              amountError && styles.errorInputContainer
            ]}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Enter amount"
                keyboardType="number-pad"
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                maxLength={6}
              />
              {amountError && (
                <Text style={styles.inputErrorText}>{amountError}</Text>
              )}
            </View>

            <Text style={styles.quickAmountsTitle}>Quick Select</Text>
            <View style={styles.quickAmountsContainer}>
              {RECHARGE_AMOUNTS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.quickAmountButton,
                    selectedAmount === amount && styles.selectedQuickAmount,
                    amount < requiredAmount && styles.insufficientAmountOption
                  ]}
                  onPress={() => handleAmountSelect(amount)}
                  disabled={amount < requiredAmount}
                >
                  <Text style={[
                    styles.quickAmountText,
                    selectedAmount === amount && styles.selectedQuickAmountText,
                    amount < requiredAmount && styles.insufficientAmountText
                  ]}>
                    ₹{amount}
                  </Text>
                  {amount < requiredAmount && (
                    <Text style={styles.insufficientLabel}>Not enough</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {amountError ? (
              <Text style={styles.errorText}>{amountError}</Text>
            ) : (
              <Text style={styles.minAmountNote}>Minimum recharge: ₹{MINIMUM_RECHARGE_AMOUNT}</Text>
            )}
          </View>
          
          {/* Replace payment methods section with this */}
          <View style={styles.sectionContainer}>
            <View style={styles.razorpayInfo}>
              <Icon name="shield-check" size={24} color={theme.colors.primary} />
              <View style={styles.razorpayTextContainer}>
                <Text style={styles.razorpayTitle}>Secure Payment with Razorpay</Text>
                <Text style={styles.razorpayDescription}>
                  Proceed to make payment using India's trusted payment gateway. You can pay using UPI, Cards, Net Banking, or Wallets.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
        
        {/* Bottom Bar with Pay Button */}
        <View style={styles.bottomBar}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>
              ₹{selectedAmount || 0}
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleBackPress}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.payButton,
                (!selectedAmount || selectedAmount <= 0 || isProcessing) && styles.disabledButton
              ]}
              onPress={handleRecharge}
              disabled={!selectedAmount || selectedAmount <= 0 || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.payButtonText}>Proceed to Pay</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      <RazorpayWebView
        visible={showRazorpayWebView}
        htmlContent={razorpayHtmlContent}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
        onClose={() => setShowRazorpayWebView(false)}
      />
    </View>
  );
} 