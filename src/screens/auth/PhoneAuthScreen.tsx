import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
  Dimensions,
  StatusBar,
  NativeEventEmitter,
  NativeModules
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../services/authContext';
import PaygoLogoText from '../../components/PaygoLogoText';
import OtpInput from '../../components/OtpInput';

// Services
import { 
  isDevelopmentPhone,
  DEV_MODE,
  sendVerificationCode
} from '../../services/supabase/authService';

// Import test phone number utilities
import { isTestPhoneNumber, getTestOTP, normalizePhoneNumber } from '../../services/auth/testPhoneNumbers';

// Import the new user utilities
import {
  completeOtpVerification,
  setSeenOnboarding,
  trackAuthState
} from '../../services/supabase/userUtils';

// Types
import { RootStackParamList } from '../../navigation/AppNavigator';

const { width, height } = Dimensions.get('window');

type PhoneAuthNavigationProp = StackNavigationProp<RootStackParamList>;
type PhoneAuthRouteProp = RouteProp<RootStackParamList, 'PhoneAuth'>;

export default function PhoneAuthScreen() {
  const navigation = useNavigation<PhoneAuthNavigationProp>();
  const route = useRoute<PhoneAuthRouteProp>();
  const auth = useAuth();
  const { verifyOtp, enableGuestMode } = auth;
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Phone entry, 2: OTP verification
  const [isReady, setIsReady] = useState(false);
  const [isDevNumber, setIsDevNumber] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [smsListener, setSmsListener] = useState<any>(null);
  const [debugTapCount, setDebugTapCount] = useState(0);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideUpAnim = useState(new Animated.Value(50))[0];

  // Refs for tracking verification state
  const isVerifyingRef = useRef(false);
  const lastErrorRef = useRef('');
  const pendingVerificationRef = useRef(false);
  
  // Debouncing verification calls
  const [lastVerifyTimestamp, setLastVerifyTimestamp] = useState(0);

  // Initialize phone number from storage
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load saved phone number if available
        const savedPhoneNumber = await AsyncStorage.getItem('lastPhoneNumber');
        if (savedPhoneNumber) {
          // Extract only the number part without country code
          const numberOnly = savedPhoneNumber.replace(/^\+91/, '');
          setPhoneNumber(numberOnly);
          // Check if this is a dev number
          setIsDevNumber(isDevelopmentPhone(savedPhoneNumber));
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('Error during PhoneAuthScreen initialization:', error);
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    // Update dev number status when phone number changes
    let formattedPhoneNumber = normalizePhoneNumber(phoneNumber);
    setIsDevNumber(isDevelopmentPhone(formattedPhoneNumber));
  }, [phoneNumber]);

  // Start entrance animation
  useEffect(() => {
    // Main content animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideUpAnim]);

  // Add SMS listener for auto-fetching OTP
  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.SmsRetriever) {
      // Start SMS Retriever
      NativeModules.SmsRetriever.startSmsRetriever()
        .then((result: any) => {
          console.log('SMS Retriever started:', result);
        })
        .catch((error: any) => {
          console.error('Error starting SMS Retriever:', error);
        });

      // Listen for SMS
      const eventEmitter = new NativeEventEmitter(NativeModules.SmsRetriever);
      const listener = eventEmitter.addListener('smsReceived', (event: any) => {
        console.log('SMS received:', event);
        if (event.message) {
          // Extract OTP from message
          const otpMatch = event.message.match(/\b\d{6}\b/);
          if (otpMatch) {
            setOtp(otpMatch[0]);
          }
        }
      });

      setSmsListener(listener);

      return () => {
        if (listener) {
          listener.remove();
        }
      };
    }
  }, []);

  // Simplified handleSendOtp function with our new utilities
  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      setMessage('Please enter a valid phone number');
      return;
    }

    try {
      setIsLoading(true);
      
      // Format the phone number using our normalize function
      const formattedPhoneNumber = normalizePhoneNumber(phoneNumber);
      
      console.log('[PhoneAuth] Sending OTP to:', formattedPhoneNumber);
      
      // Use our utility function to send verification code
      const result = await sendVerificationCode(formattedPhoneNumber);
      
      if (result.success) {
        // Store verification ID and phone number
        setVerificationId(result.verificationId);
        await AsyncStorage.setItem('lastPhoneNumber', formattedPhoneNumber);
        
        // Move to OTP verification step
        setStep(2);
        
        // Show debug information for development phones
        if (isDevNumber) {
          const testOTP = getTestOTP(formattedPhoneNumber);
          if (testOTP) {
            setMessage(`Test phone detected. You MUST use this code: ${testOTP}`);
          } else {
            setMessage('Test phone detected. Use code: 123456');
          }
        } else {
          setMessage('Verification code sent to your phone!');
        }
      } else {
        // Handle error
        setMessage('Failed to send verification code. Please try again.');
      }
    } catch (error) {
      console.error('[PhoneAuth] Error sending OTP:', error);
      setMessage('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Simplified handleVerifyOtp function with our new utilities
  const handleVerifyOtp = async () => {
    // Check if OTP is valid
    if (!verificationId || !otp || otp.length < 6) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }
    
    // Prevent multiple verification attempts
    const now = Date.now();
    if (now - lastVerifyTimestamp < 3000 || isVerifyingRef.current || pendingVerificationRef.current) {
      console.log('Verification throttled - too many attempts or already in progress');
      return;
    }
    
    // Set verification flags
    setLastVerifyTimestamp(now);
    setIsVerifying(true);
    isVerifyingRef.current = true;
    pendingVerificationRef.current = true;
    
    try {
      // Clear error state
      setOtpError('');
      
      // Format phone number with our normalize function
      const formattedPhoneNumber = normalizePhoneNumber(phoneNumber);
      
      console.log('[PhoneAuth] Starting OTP verification process for:', formattedPhoneNumber);
      
      // For dev mode and test phones, bypass verification
      let verified = false;
      if (DEV_MODE && isDevNumber) {
        console.log('[PhoneAuth] Dev phone detected, checking test codes');
        
        // Get the specific test code for this phone number
        const specificTestCode = getTestOTP(formattedPhoneNumber);
        
        if (specificTestCode) {
          // For test phone numbers, only check their specific OTP
          console.log('[PhoneAuth] Test phone number with predefined OTP detected');
          console.log(`[PhoneAuth] Checking input OTP: ${otp.trim()} against expected: ${specificTestCode}`);
          if (otp.trim() === specificTestCode) {
            verified = true;
            console.log('[PhoneAuth] Valid test code used, bypassing verification');
          } else {
            setOtpError(`Invalid code. For this test number, use: ${specificTestCode}`);
            console.error(`[PhoneAuth] Invalid code. Expected: ${specificTestCode}, got: ${otp.trim()}`);
            throw new Error(`Invalid verification code. Try: ${specificTestCode}`);
          }
        } else {
          // For regular dev phones, accept any of these test codes
          const validTestCodes = [
            '123456',
            '000000',
            formattedPhoneNumber.slice(-6), // Last 6 digits of phone
          ];
          
          if (validTestCodes.includes(otp.trim())) {
            verified = true;
            console.log('[PhoneAuth] Valid test code used, bypassing verification');
          }
        }
      }
      
      if (!verified) {
        // Verify the OTP with Supabase
        verified = await verifyOtp(verificationId, otp.trim(), formattedPhoneNumber);
      }
      
      if (verified) {
        console.log('[PhoneAuth] OTP verification successful, completing auth flow');
        
        // Use our new utility to complete OTP verification
        const completionResult = await completeOtpVerification(
          formattedPhoneNumber,
          true, // isNewUser, will be checked inside the function
          undefined // no display name yet
        );
        
        if (completionResult.success) {
          console.log('[PhoneAuth] Auth flow completed successfully:', completionResult);
          
          const isNewUser = !completionResult.profile?.display_name;
          
          // Ensure we're not in guest mode
          await AsyncStorage.removeItem('@paygo/guest_mode');
          
          // If new user, mark onboarding as seen (since we're showing it again)
          if (isNewUser) {
            await setSeenOnboarding(true);
            
            // For new users, go directly to profile creation
            navigation.replace('ProfileCreation', {
              userId: completionResult.userId!,
              phoneNumber: formattedPhoneNumber
            });
          } else {
            // For existing users, complete the authentication
            console.log('[PhoneAuth] Completing authentication for existing user');
            
            // Properly set authentication state in AuthContext
            await auth.completeAuthentication(
              completionResult.userId || '',
              formattedPhoneNumber,
              completionResult.profile?.display_name
            );
            
            // Also track in storage
            await trackAuthState({
              isAuthenticated: true,
              userId: completionResult.userId,
              phoneNumber: formattedPhoneNumber,
              displayName: completionResult.profile?.display_name
            });
            
            // Add a small delay to ensure auth state is updated
            setTimeout(() => {
              // Navigate to main app
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Main' }]
                })
              );
            }, 300);
          }
        } else {
          console.error('[PhoneAuth] Failed to complete OTP verification:', completionResult.error);
          setOtpError(completionResult.error || 'Verification failed. Please try again.');
        }
      } else {
        console.error('[PhoneAuth] OTP verification failed');
        setOtpError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      console.error('[PhoneAuth] Error during OTP verification:', error);
      setOtpError('An error occurred during verification. Please try again.');
    } finally {
      setIsVerifying(false);
      isVerifyingRef.current = false;
      pendingVerificationRef.current = false;
    }
  };

  const handleOtpChange = (text: string) => {
    setOtp(text);
    setOtpError('');
    
    // Trigger verification when OTP is completed
    if (text.length === 6) {
      // Add a small delay to ensure the UI shows all digits
      setTimeout(() => {
        handleVerifyOtp();
      }, 300);
    }
  };
  
  const handleRetry = () => {
    setOtp('');
    setOtpError('');
    setVerificationId('');
    setStep(1);
    setMessage('Enter the verification code sent to your phone');
  };
  
  // Skip authentication and use guest mode
  const handleSkipForNow = async () => {
    try {
      setIsVerifying(true);
      
      // Enable guest mode
      await enableGuestMode();
      
      // Make sure guest mode is set in storage
      await AsyncStorage.setItem('@paygo/guest_mode', 'true');
      
      // Make sure we're not authenticated
      await trackAuthState({
        isAuthenticated: false
      });
      
      // Short delay to ensure state changes are processed
      setTimeout(() => {
        // Navigate to the main app
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Main' }]
          })
        );
      }, 300);
    } catch (error) {
      console.error('Error enabling guest mode:', error);
      Alert.alert('Error', 'Failed to enable guest mode. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Show special message for dev phones
  const showDevPhoneHint = DEV_MODE && isDevNumber;

  // Add auto-fill for test phone 
  const handleAutoFillTestOtp = () => {
    if (isDevNumber) {
      const testOTP = getTestOTP(normalizePhoneNumber(phoneNumber));
      if (testOTP) {
        setOtp(testOTP);
        // Give UI time to update before submitting
        setTimeout(() => {
          handleVerifyOtp();
        }, 300);
      }
    }
  };

  // Show loading state while preparing
  if (!isReady) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#118347" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -24}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
          >
            <View style={styles.mainContent}>
              <View style={styles.logoContainer}>
                <PaygoLogoText size="small" color="#000000" fitColor="#4CD964" />
              </View>

              <Text style={styles.title}>Welcome to Paygo.fit</Text>
              <Text style={styles.subtitle}>
                {step === 1 
                  ? "Enter your phone number to continue"
                  : "Enter the code sent to your phone"
                }
              </Text>

              {step === 1 ? (
                <View style={styles.formContent}>
                  {message ? (
                    <View style={styles.stableErrorContainer}>
                      <Text style={styles.errorText}>{message}</Text>
                    </View>
                  ) : (
                    <View style={styles.stableErrorContainer}></View>
                  )}
                  <View style={styles.inputContainer}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Phone number"
                      value={phoneNumber}
                      onChangeText={(text) => {
                        setPhoneNumber(text.replace(/[^0-9]/g, ''));
                        setMessage('');
                      }}
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!isVerifying}
                    />
                  </View>

                  {showDevPhoneHint && (
                    <View style={styles.devHintContainer}>
                      <Text style={styles.devHintText}>
                        {isTestPhoneNumber(normalizePhoneNumber(phoneNumber))
                          ? `⚠️ TEST PHONE: You MUST use exactly this code: ${getTestOTP(normalizePhoneNumber(phoneNumber))}`
                          : `Test phone detected! You can use codes: 123456, 000000, or ${phoneNumber.slice(-6)}`
                        }
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={[styles.button, isVerifying && styles.buttonDisabled]} 
                    onPress={handleSendOtp}
                    disabled={isVerifying}
                  >
                    <Text style={styles.buttonText}>
                      {isVerifying ? 'Sending...' : 'Continue'}
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Skip button - prominently displayed */}
                  <TouchableOpacity 
                    style={styles.skipButton}
                    onPress={handleSkipForNow}
                  >
                    <Text style={styles.skipButtonText}>Skip for now</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.skipHelpText}>
                    You can browse without signing in, but you'll need an account to make bookings.
                  </Text>
                </View>
              ) : (
                <View style={styles.formContent}>
                  <Text style={styles.phoneConfirmText}>
                    Enter the code sent to <Text style={styles.phoneHighlight}>+91 {phoneNumber}</Text>
                  </Text>
                  {otpError ? (
                    <View style={styles.stableErrorContainer}>
                      <Text style={styles.errorText}>{otpError}</Text>
                      <TouchableOpacity 
                        onPress={handleRetry}
                        style={styles.retryButton}
                        disabled={isVerifying || pendingVerificationRef.current}
                      >
                        <Text style={styles.retryText}>Try Again</Text>
                      </TouchableOpacity>
                    </View>
                  ) : message ? (
                    <View style={styles.stableErrorContainer}>
                      <Text style={styles.messageText}>{message}</Text>
                    </View>
                  ) : (
                    <View style={styles.stableErrorContainer}></View>
                  )}
                  <OtpInput
                    length={6}
                    onOtpChange={handleOtpChange}
                    autoFocus={true}
                    disabled={isVerifying || pendingVerificationRef.current}
                    style={styles.otpContainer}
                  />

                  <TouchableOpacity 
                    style={[styles.button, isVerifying && styles.buttonDisabled]} 
                    onPress={handleVerifyOtp}
                    disabled={isVerifying || pendingVerificationRef.current}
                  >
                    <Text style={styles.buttonText}>
                      {isVerifying ? 'Verifying...' : 'Verify'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.changeNumberButton}
                    onPress={() => {
                      // Prevent changing number during verification
                      if (isVerifyingRef.current || pendingVerificationRef.current) return;
                      
                      setStep(1);
                      setOtp('');
                      setMessage('');
                      setOtpError('');
                      pendingVerificationRef.current = false;
                    }}
                    disabled={isVerifying || pendingVerificationRef.current}
                  >
                    <Text style={styles.changeNumberText}>Change number</Text>
                  </TouchableOpacity>

                  {step === 2 && isDevNumber && getTestOTP(normalizePhoneNumber(phoneNumber)) && (
                    <TouchableOpacity 
                      style={styles.autoFillButton}
                      onPress={handleAutoFillTestOtp}
                      disabled={isVerifying}
                    >
                      <Text style={styles.autoFillText}>
                        Auto-fill Test OTP: {getTestOTP(normalizePhoneNumber(phoneNumber))}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our
            </Text>
            <View style={styles.linksContainer}>
              <TouchableOpacity
                onPress={() => {
                  console.log('Navigating to Terms and Services');
                  navigation.navigate('TermsAndServices');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                activeOpacity={0.6}
              >
                <Text style={styles.termsLink}>
                  Terms & Conditions
                </Text>
              </TouchableOpacity>
              <Text style={styles.textSeparator}>•</Text>
              <TouchableOpacity
                onPress={() => {
                  console.log('Navigating to Privacy Policy');
                  navigation.navigate('PrivacyPolicy');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                activeOpacity={0.6}
              >
                <Text style={styles.termsLink}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
  },
  formContent: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-start',
  },
  logoContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
  },
  countryCode: {
    width: 56,
    height: 52,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#000000',
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#118347',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  skipButtonText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  skipHelpText: {
    color: '#666666',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  retryButton: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#fff',
  },
  retryText: {
    color: '#118347',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    textDecorationLine: 'underline',
    backgroundColor: '#fff',
  },
  termsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  linksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  textSeparator: {
    color: '#666666',
    fontSize: 12,
    marginHorizontal: 8,
  },
  termsText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#118347',
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: '#333',
  },
  otpContainer: {
    width: '100%',
    marginBottom: 24,
  },
  changeNumberButton: {
    padding: 12,
    marginTop: 8,
  },
  changeNumberText: {
    color: '#118347',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  phoneConfirmText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  phoneHighlight: {
    fontWeight: 'bold',
    color: '#000',
  },
  stableErrorContainer: {
    minHeight: 44,
    width: '100%',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  messageText: {
    color: '#118347',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  devHintContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF9E0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  devHintText: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  autoFillButton: {
    padding: 12,
    marginTop: 16,
    backgroundColor: '#e6f7ef',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#118347',
  },
  autoFillText: {
    color: '#118347',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 