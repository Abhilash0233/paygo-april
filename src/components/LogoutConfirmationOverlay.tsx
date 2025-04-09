import React from 'react';
import { Text, StyleSheet } from 'react-native';
import BaseOverlay from './BaseOverlay';

interface LogoutConfirmationOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut: boolean;
}

export default function LogoutConfirmationOverlay({
  isVisible,
  onClose,
  onConfirm,
  isLoggingOut
}: LogoutConfirmationOverlayProps) {
  return (
    <BaseOverlay
      visible={isVisible}
      onClose={onClose}
      title="Sign Out"
      subtitle="Are you sure you want to sign out?"
      icon={{
        name: "log-out",
        color: "#666",
        size: 40
      }}
      primaryButton={{
        label: isLoggingOut ? "Signing Out..." : "Sign Out",
        onPress: onConfirm,
        disabled: isLoggingOut,
        color: "#FF3B30"
      }}
      secondaryButton={{
        label: "Cancel",
        onPress: onClose,
        disabled: isLoggingOut
      }}
    >
      <Text style={styles.message}>
        You'll need to sign in again to access your bookings, wallet, and other account features. Your data will remain safe and secure.
      </Text>
    </BaseOverlay>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 22,
  }
}); 