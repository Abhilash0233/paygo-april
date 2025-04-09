import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../services/authContext';
import { useWallet } from '../../services/walletContext';
import { supabase } from '../../config/supabaseConfig';
import AppHeader from '../../components/AppHeader';

type WalletServiceScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface WalletSettings {
  auto_recharge_enabled: boolean;
  auto_recharge_threshold: number;
  auto_recharge_amount: number;
  preferred_payment_method: string;
  transaction_notifications: boolean;
  low_balance_alerts: boolean;
  low_balance_threshold: number;
}

const DEFAULT_SETTINGS: WalletSettings = {
  auto_recharge_enabled: false,
  auto_recharge_threshold: 100,
  auto_recharge_amount: 500,
  preferred_payment_method: 'upi',
  transaction_notifications: true,
  low_balance_alerts: true,
  low_balance_threshold: 200,
};

export default function WalletServiceScreen() {
  const navigation = useNavigation<WalletServiceScreenNavigationProp>();
  const { user } = useAuth();
  const { walletBalance } = useWallet();
  
  const [settings, setSettings] = useState<WalletSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load saved wallet settings
  useEffect(() => {
    async function loadWalletSettings() {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('wallet_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching wallet settings:', error);
          Alert.alert('Error', 'Failed to load wallet settings. Please try again.');
          return;
        }
        
        if (data) {
          // Merge saved settings with defaults for any missing properties
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
          });
        }
      } catch (error) {
        console.error('Exception loading wallet settings:', error);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadWalletSettings();
  }, [user]);

  // Track whether user has changed any settings
  useEffect(() => {
    setHasChanges(true);
  }, [settings]);

  // Update a specific setting
  const updateSetting = <K extends keyof WalletSettings>(
    key: K,
    value: WalletSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save wallet settings
  const saveSettings = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save settings.');
      return;
    }
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('wallet_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select();
      
      if (error) {
        console.error('Error saving wallet settings:', error);
        Alert.alert('Error', 'Failed to save settings. Please try again.');
        return;
      }
      
      setHasChanges(false);
      Alert.alert('Success', 'Wallet settings saved successfully.');
    } catch (error) {
      console.error('Exception saving wallet settings:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render the save button for the header
  const SaveButton = () => (
    <TouchableOpacity
      style={[
        styles.saveButton,
        (!hasChanges || isSaving) && styles.saveButtonDisabled,
      ]}
      onPress={saveSettings}
      disabled={!hasChanges || isSaving}
    >
      {isSaving ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.saveButtonText}>Save</Text>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#118347" />
        <Text style={styles.loadingText}>Loading wallet settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Wallet Service"
        showBackButton
        rightComponent={<SaveButton />}
      />
      
      <ScrollView style={styles.scrollView}>
        {/* Current Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>₹{walletBalance}</Text>
          <TouchableOpacity
            style={styles.rechargeButton}
            onPress={() => navigation.navigate('WalletRecharge', {})}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.rechargeButtonText}>Recharge Now</Text>
          </TouchableOpacity>
        </View>
        
        {/* Auto Recharge Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="repeat" size={22} color="#118347" />
            <Text style={styles.sectionTitle}>Auto Recharge</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>Enable Auto Recharge</Text>
              <Text style={styles.settingDescription}>
                Automatically recharge your wallet when balance falls below threshold
              </Text>
            </View>
            <Switch
              value={settings.auto_recharge_enabled}
              onValueChange={(value) => updateSetting('auto_recharge_enabled', value)}
              trackColor={{ false: '#E5E5E5', true: '#118347' }}
              thumbColor={settings.auto_recharge_enabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          
          {settings.auto_recharge_enabled && (
            <>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Threshold Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.auto_recharge_threshold.toString()}
                  onChangeText={(value) => {
                    const numValue = parseInt(value) || 0;
                    updateSetting('auto_recharge_threshold', numValue);
                  }}
                  keyboardType="numeric"
                  placeholder="100"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Recharge Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.auto_recharge_amount.toString()}
                  onChangeText={(value) => {
                    const numValue = parseInt(value) || 0;
                    updateSetting('auto_recharge_amount', numValue);
                  }}
                  keyboardType="numeric"
                  placeholder="500"
                />
              </View>
            </>
          )}
        </View>
        
        {/* Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={22} color="#118347" />
            <Text style={styles.sectionTitle}>Preferred Payment Method</Text>
          </View>
          
          <View style={styles.optionsContainer}>
            {['upi', 'card', 'netbanking', 'wallet'].map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentOption,
                  settings.preferred_payment_method === method && styles.paymentOptionSelected,
                ]}
                onPress={() => updateSetting('preferred_payment_method', method)}
              >
                <Ionicons
                  name={
                    method === 'upi' ? 'phone-portrait' :
                    method === 'card' ? 'card' :
                    method === 'netbanking' ? 'laptop' : 'wallet'
                  }
                  size={20}
                  color={settings.preferred_payment_method === method ? '#118347' : '#666666'}
                />
                <Text
                  style={[
                    styles.paymentOptionText,
                    settings.preferred_payment_method === method && styles.paymentOptionTextSelected,
                  ]}
                >
                  {method === 'upi' ? 'UPI' :
                   method === 'card' ? 'Card' :
                   method === 'netbanking' ? 'Net Banking' : 'Wallet'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Notification Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={22} color="#118347" />
            <Text style={styles.sectionTitle}>Notification Settings</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>Transaction Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications for all wallet transactions
              </Text>
            </View>
            <Switch
              value={settings.transaction_notifications}
              onValueChange={(value) => updateSetting('transaction_notifications', value)}
              trackColor={{ false: '#E5E5E5', true: '#118347' }}
              thumbColor={settings.transaction_notifications ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>Low Balance Alerts</Text>
              <Text style={styles.settingDescription}>
                Get notified when your wallet balance falls below threshold
              </Text>
            </View>
            <Switch
              value={settings.low_balance_alerts}
              onValueChange={(value) => updateSetting('low_balance_alerts', value)}
              trackColor={{ false: '#E5E5E5', true: '#118347' }}
              thumbColor={settings.low_balance_alerts ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          
          {settings.low_balance_alerts && (
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Low Balance Threshold (₹)</Text>
              <TextInput
                style={styles.input}
                value={settings.low_balance_threshold.toString()}
                onChangeText={(value) => {
                  const numValue = parseInt(value) || 0;
                  updateSetting('low_balance_threshold', numValue);
                }}
                keyboardType="numeric"
                placeholder="200"
              />
            </View>
          )}
        </View>
        
        {/* Important Information */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={22} color="#666666" />
          <Text style={styles.infoText}>
            Auto-recharge will use your preferred payment method. Make sure you have sufficient 
            funds in your linked accounts. You can disable auto-recharge at any time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#118347',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceSection: {
    backgroundColor: '#118347',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rechargeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666666',
  },
  inputRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  paymentOptionSelected: {
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#118347',
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
    fontWeight: '500',
  },
  paymentOptionTextSelected: {
    color: '#118347',
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666666',
    marginLeft: 8,
    lineHeight: 18,
  },
}); 