import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';

interface OtpInputProps {
  length?: number;
  onOtpChange: (otp: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  style?: object;
}

const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  onOtpChange,
  autoFocus = true,
  disabled = false,
  style = {},
}) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Initialize refs array
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  useEffect(() => {
    // Pass the complete OTP to parent component
    onOtpChange(otp.join(''));
  }, [otp, onOtpChange]);

  const handleChange = (text: string, index: number) => {
    // Handle paste events (multiple digits)
    if (text.length > 1) {
      handleMultipleDigits(text);
      return;
    }
    
    // Only allow digits
    if (/^\d*$/.test(text)) {
      const newOtp = [...otp];
      // Take only the last digit if multiple characters are pasted
      const digit = text.slice(-1);
      newOtp[index] = digit;
      setOtp(newOtp);

      // Auto-focus next input if a digit was entered
      if (text && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleMultipleDigits = (text: string) => {
    // Check if pasted text is a valid OTP
    if (/^\d+$/.test(text)) {
      const digits = text.split('').slice(0, length);
      const newOtp = [...digits, ...Array(length - digits.length).fill('')];
      setOtp(newOtp);
      
      // Focus the input after the last pasted digit
      if (digits.length < length) {
        inputRefs.current[digits.length]?.focus();
      } else {
        // If all inputs are filled, focus the last one
        inputRefs.current[length - 1]?.focus();
        // Dismiss keyboard after small delay
        setTimeout(() => Keyboard.dismiss(), 100);
      }
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, style]}>
        {Array(length)
          .fill(0)
          .map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.input,
                otp[index] ? styles.inputFilled : {},
                disabled ? styles.inputDisabled : {},
              ]}
              value={otp[index]}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              autoFocus={autoFocus && index === 0}
              editable={!disabled}
              selectTextOnFocus
              selectionColor="#118347"
              caretHidden={true}
            />
          ))}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 20,
  },
  input: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    backgroundColor: '#F9F9F9',
  },
  inputFilled: {
    borderColor: '#118347',
    backgroundColor: 'rgba(17, 131, 71, 0.05)',
  },
  inputDisabled: {
    backgroundColor: '#F0F0F0',
    color: '#999999',
  },
});

export default OtpInput; 