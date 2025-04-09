import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { auth } from '../../firebase/config';
import { useWallet } from '../../services/walletContext';
import { getWalletTransactions, WalletTransaction } from '../../services/walletService';
import { format } from 'date-fns';
import { RootStackParamList } from '../../navigation/AppNavigator';

type WalletScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function WalletScreen() {
  const navigation = useNavigation<WalletScreenNavigationProp>();
  const { walletBalance, isLoading: isBalanceLoading, fetchWalletBalance, balanceError } = useWallet();

  const handleContactSupport = () => {
    navigation.navigate('HelpSupport', {
      category: 'Wallet',
      subCategory: 'Balance Issues',
      initialMessage: 'My wallet balance is not updating after making a payment'
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <View style={styles.placeholder} />
        </View>
        
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

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('WalletRecharge')}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="add-circle" size={24} color="#118347" />
              </View>
              <Text style={styles.actionText}>Add Money</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('WalletTransactions')}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="time" size={24} color="#118347" />
              </View>
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
          </View>

          {/* Balance Update Message */}
          <View style={styles.messageContainer}>
            <View style={styles.messageContent}>
              <Ionicons name="information-circle" size={24} color="#118347" style={styles.messageIcon} />
              <Text style={styles.messageText}>
                If you have made a payment and the balance is not reflecting here, please pull down to refresh or go back and return to this screen.
              </Text>
            </View>
            
            {/* Support Contact Section */}
            <View style={styles.supportContainer}>
              <Text style={styles.supportText}>
                Still not seeing your updated balance?
              </Text>
              <TouchableOpacity 
                style={styles.supportButton}
                onPress={handleContactSupport}
              >
                <Ionicons name="headset" size={20} color="#FFFFFF" style={styles.supportIcon} />
                <Text style={styles.supportButtonText}>Contact Support Team</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  balanceContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#118347',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#E74C3C',
    fontWeight: '500',
  },
  retryButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#118347',
  },
  retryText: {
    fontSize: 12,
    color: '#118347',
    fontWeight: '500',
  },
  messageContainer: {
    padding: 16,
    marginTop: 16,
  },
  messageContent: {
    flexDirection: 'row',
    backgroundColor: '#E8F5EE',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  messageIcon: {
    marginRight: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#118347',
    lineHeight: 20,
  },
  supportContainer: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  supportText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#118347',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  supportIcon: {
    marginRight: 8,
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 