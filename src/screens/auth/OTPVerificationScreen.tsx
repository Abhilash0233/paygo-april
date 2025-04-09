import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Vibration,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../services/authContext';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

// Services
import { verifyCode, BACKUP_VERIFICATION_CODE } from '../../services/twilioService';
import { getUserByPhoneNumber } from '../../services/userService';

type OTPVerificationRouteProp = RouteProp<RootStackParamList, 'OTPVerification'>;
type OTPVerificationNavigationProp = StackNavigationProp<RootStackParamList, 'OTPVerification'>;

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 30; // 30 seconds timeout for resend
const { width, height } = Dimensions.get('window');
const PIN_SPACING = 10;
const PIN_SIZE = (width - PIN_SPACING * 14) / OTP_LENGTH;

export default function OTPVerificationScreen() {
  const navigation = useNavigation<OTPVerificationNavigationProp>();
  const route = useRoute<OTPVerificationRouteProp>();
  const { phoneNumber = '', verificationId = '' } = route.params || {};
  const { setCurrentUser } = useAuth();
  
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [smsDetectionActive, setSmsDetectionActive] = useState(true);
  const [smsRetrieverActive, setSmsRetrieverActive] = useState(false);
  const smsListener = useRef<EmitterSubscription | null>(null);

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const digitAnimations = useRef<Animated.Value[]>(
    Array(OTP_LENGTH).fill(0).map(() => new Animated.Value(0))
  ).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Initialize countdown for resend button
  useEffect(() => {
    if (timeLeft > 0 && !canResend) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !canResend) {
      setCanResend(true);
      // Vibrate to notify user they can resend
      Vibration.vibrate(100);
    }
  }, [timeLeft, canResend]);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
    
    // Auto-focus the input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
  }, [fadeAnim, scaleAnim]);

  // Log verification parameters for debugging
  useEffect(() => {
    console.log('[OTP] Screen initialized with:', { 
      phoneNumber,
      verificationId: verificationId ? `${verificationId.substring(0, 10)}...` : 'MISSING'
    });
    
    // Handle missing verification ID
    if (!verificationId) {
      console.warn('[OTP] Missing verification ID - fallback will be used');
    }
  }, [phoneNumber, verificationId]);

  // Handle verification
  const handleVerifyOTP = async () => {
    try {
      if (otpCode.length !== OTP_LENGTH) {
        setErrorMessage('Please enter a valid 6-digit code');
        animateErrorShake();
        return;
      }
      
      setIsLoading(true);
      setErrorMessage('');
      
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
      
      console.log('[OTP] Verifying code:', otpCode, 'for phone:', phoneNumber);
      
      try {
        // Try to verify using our service (with fallbacks built in)
        const verificationResult = await verifyCode(verificationId, otpCode, phoneNumber);
        
        console.log('[OTP] Verification result:', verificationResult);
        
        if (verificationResult.success) {
          // Check if user already exists
          try {
            const existingUser = await getUserByPhoneNumber(phoneNumber);
            
            if (existingUser) {
              console.log('[OTP] Existing user found:', existingUser);
              setCurrentUser(existingUser);
              
              // Bypass onboarding by navigating directly to Main stack
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ 
                    name: 'Main'  // Changed from HomeStack to Main to bypass onboarding
                  }],
                })
              );
            } else {
              console.log('[OTP] New user, creating profile');
              setCurrentUser(verificationResult.user);
              navigation.navigate('ProfileCreation', {
                userId: verificationResult.user?.id,
                phoneNumber
              });
            }
          } catch (userError) {
            console.error('[OTP] Error checking user existence:', userError);
            setCurrentUser(verificationResult.user);
            navigation.navigate('ProfileCreation', {
              userId: verificationResult.user?.id,
              phoneNumber
            });
          }
        } else {
          setErrorMessage('Verification failed. Please try again.');
          animateErrorShake();
        }
      } catch (verificationError: any) {
        console.error('[OTP] Error in verification process:', verificationError);
        setErrorMessage(verificationError.message || 'Verification failed. Please try again.');
        animateErrorShake();
      }
    } catch (error: any) {
      console.error('[OTP] Critical error:', error);
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
      animateErrorShake();
    } finally {
      setIsLoading(false);
    }
  };

  // Shake animation for error
  const animateErrorShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
    
    // Haptic feedback for error
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.log('Haptic feedback error:', error);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;
    
    try {
      setIsLoading(true);
      setCanResend(false);
      setTimeLeft(RESEND_TIMEOUT);
      
      // Navigate back to phone screen to restart the process
      navigation.goBack();
    } catch (error) {
      console.error('[OTP] Error resending code:', error);
      setErrorMessage('Failed to resend code. Please try again.');
      animateErrorShake();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP paste functionality
  const handlePasteOTP = async (pastedText?: string) => {
    try {
      let text = pastedText;
      
      if (!text) {
        text = await Clipboard.getStringAsync();
      }
      
      if (text) {
        // Extract digits only and remove any whitespace
        const digits = text.replace(/[^\d]/g, '');
        console.log('[OTP] Extracted digits:', digits);
        
        // Check if we have enough digits
        if (digits.length >= OTP_LENGTH) {
          // Take only the first OTP_LENGTH digits
          const validOTP = digits.substring(0, OTP_LENGTH);
          console.log('[OTP] Setting valid OTP:', validOTP);
          
          // Set the OTP
          setOtpCode(validOTP);
          // Clear any previous error
          setErrorMessage('');
          // Trigger verification after a short delay
          setTimeout(() => {
            handleVerifyOTP();
          }, 300);
          
          // Provide success haptic feedback
          if (!pastedText) {  // Only for user paste, not auto-detection
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.log('Haptic feedback error:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error pasting OTP:', error);
    }
  };
  
  // Set digits with sequential animation
  const setDigitsWithAnimation = (fullCode: string) => {
    // Reset animations
    digitAnimations.forEach((anim: Animated.Value) => anim.setValue(0));
    
    // Set digits with minimal delay for better UX
    let delay = 50; // Reduced from 80ms to 50ms
    for (let i = 0; i < fullCode.length; i++) {
      setTimeout(() => {
        setOtpCode(fullCode.substring(0, i + 1));
        // Trigger verification when all digits are set
        if (i === fullCode.length - 1) {
          setTimeout(handleVerifyOTP, 300);
        }
      }, i * delay);
    }
  };

  // Handle OTP input
  const handleOTPChange = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    
    // Limit length to OTP_LENGTH
    if (cleaned.length <= OTP_LENGTH) {
      setOtpCode(cleaned);
      
      // Auto-submit when complete
      if (cleaned.length === OTP_LENGTH) {
        Keyboard.dismiss();
        handleVerifyOTP();
      }
    }
  };

  // Render OTP input boxes
  const renderOTPBoxes = () => {
    const boxes = [];
    
    for (let i = 0; i < OTP_LENGTH; i++) {
      const isFilled = i < otpCode.length;
      const digit = otpCode[i] || '';
      
      boxes.push(
        <View key={i} style={[styles.otpBox, isFilled && styles.otpBoxFilled]}>
          <Text style={styles.otpText}>{digit}</Text>
        </View>
      );
    }
    
    return boxes;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim }
              ]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          
          <View style={styles.header}>
            <Text style={styles.title}>Verification Code</Text>
            <Text style={styles.subtitle}>
              Please enter the code sent to
            </Text>
            <Text style={styles.phoneNumberText}>{phoneNumber}</Text>
          </View>
          
          {/* Test code hint for India */}
          <View style={styles.testCodeContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#4CAF50" />
            <Text style={styles.testCodeText}>
              Try {BACKUP_VERIFICATION_CODE} if you don't receive a code
            </Text>
          </View>
          
          <View style={styles.otpContainer}>
            <View style={styles.otpBoxesContainer}>
              {renderOTPBoxes()}
            </View>
            
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={otpCode}
              onChangeText={handleOTPChange}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              autoFocus
            />
          </View>
          
          {errorMessage ? (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          ) : null}
          
          <TouchableOpacity
            style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
            onPress={handleVerifyOTP}
            disabled={isLoading || otpCode.length !== OTP_LENGTH}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Code</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResendOTP}>
                <Text style={styles.resendButtonText}>Resend</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendCountdown}>{timeLeft}s</Text>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 20,
  },
  header: {
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  phoneNumberText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 32,
  },
  testCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 24,
    alignSelf: 'center',
  },
  testCodeText: {
    fontSize: 14,
    color: '#388E3C',
    marginLeft: 8,
    fontWeight: '500',
  },
  otpContainer: {
    marginBottom: 32,
  },
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpBox: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  otpBoxFilled: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  otpText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorMessage: {
    color: '#f44336',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: '#666',
    fontSize: 14,
  },
  resendButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  resendCountdown: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  digitBox: {
    width: (width - 100) / 6,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  digitBoxFilled: {
    backgroundColor: '#f0f7f3',
  },
  digitBoxError: {
    backgroundColor: '#ffebee',
  },
  digitText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cursor: {
    width: 1.5,
    height: 20,
    backgroundColor: '#118347',
    opacity: 0.6,
  },
}); 