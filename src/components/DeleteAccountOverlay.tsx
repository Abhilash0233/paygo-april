import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BaseOverlay from './BaseOverlay';

interface DeleteAccountOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function DeleteAccountOverlay({
  isVisible,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteAccountOverlayProps) {
  return (
    <BaseOverlay
      visible={isVisible}
      onClose={onClose}
      title="Delete Account"
      icon={{
        name: "warning",
        color: "#cc3300",
        size: 40
      }}
      primaryButton={{
        label: isDeleting ? "Deleting..." : "Delete Account",
        onPress: onConfirm,
        disabled: isDeleting,
        color: "#cc3300"
      }}
      secondaryButton={{
        label: "Cancel",
        onPress: onClose
      }}
    >
      <View style={styles.content}>
        <Text style={styles.warningTitle}>Are you sure?</Text>
        <Text style={styles.warningText}>
          This action cannot be undone. Your account and all associated data will be permanently deleted, including:
        </Text>

        <View style={styles.bulletPoints}>
          <View style={styles.bulletPoint}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.bulletText}>Your profile information</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Ionicons name="calendar" size={16} color="#666" />
            <Text style={styles.bulletText}>All booking history</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Ionicons name="wallet" size={16} color="#666" />
            <Text style={styles.bulletText}>Wallet balance and transactions</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Ionicons name="settings" size={16} color="#666" />
            <Text style={styles.bulletText}>Preferences and settings</Text>
          </View>
        </View>
      </View>
    </BaseOverlay>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: 8,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#cc3300',
    textAlign: 'center',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  bulletPoints: {
    marginBottom: 30,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulletText: {
    fontSize: 15,
    color: '#666',
    marginLeft: 12,
  },
}); 