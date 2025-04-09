import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/authContext';
import { 
  getPaymentConfig, 
  updatePaymentMode, 
  getRazorpayKey,
  PaymentConfig 
} from '../../services/supabase/paymentConfigService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

/**
 * Screen for managing payment gateway settings
 * This screen allows users to view and modify payment configuration
 */
export default function PaymentSettingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string | null>(null);

  // Fetch the current configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        // Fetch current configuration
        const currentConfig = await getPaymentConfig();
        setConfig(currentConfig);
        
        // Get Razorpay key 
        const key = await getRazorpayKey();
        setRazorpayKey(key);
      } catch (error) {
        console.error('Error initializing payment settings screen:', error);
        Alert.alert('Error', 'Failed to load payment gateway configuration');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfig();
  }, [user, navigation]);

  // Function to toggle the payment mode
  const handleToggleMode = async () => {
    if (!user || !config) return;
    
    try {
      setIsUpdating(true);
      
      // Confirm the change
      const newMode = !config.is_live_mode;
      const message = newMode
        ? 'Switching to LIVE mode will process REAL payments. Are you sure?'
        : 'Switching to TEST mode. No real payments will be processed.';
      
      // Use a Promise to handle Alert confirmation
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Change Payment Mode',
          message,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Confirm',
              onPress: () => resolve(true),
            },
          ],
          { cancelable: false }
        );
      });
      
      if (!confirmed) {
        setIsUpdating(false);
        return;
      }
      
      // Update the configuration
      const success = await updatePaymentMode(newMode, user.id);
      
      if (!success) {
        Alert.alert('Error', 'Failed to update payment mode.');
        return;
      }
      
      // Update local state
      setConfig({
        ...config,
        is_live_mode: newMode,
        last_updated: new Date().toISOString(),
        updated_by: user.id
      });
      
      // Refresh Razorpay key
      const key = await getRazorpayKey();
      setRazorpayKey(key);
      
      Alert.alert(
        'Configuration Updated',
        `Payment gateway is now in ${newMode ? 'LIVE' : 'TEST'} mode.`
      );
    } catch (error) {
      console.error('Error updating payment mode:', error);
      Alert.alert('Error', 'Failed to update payment gateway mode');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#118347" />
        <Text style={styles.loadingText}>Loading payment configuration...</Text>
      </SafeAreaView>
    );
  }

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>
          Unable to load payment settings. Please try again later.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Settings</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={24} color="#118347" />
            <Text style={styles.cardTitle}>Payment Gateway Configuration</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.configDetail}>
            <Text style={styles.label}>Mode:</Text>
            <View style={styles.valueContainer}>
              <Text
                style={[
                  styles.value,
                  { color: config.is_live_mode ? '#e74c3c' : '#118347' }
                ]}
              >
                {config.is_live_mode ? 'LIVE' : 'TEST'}
              </Text>
            </View>
          </View>
          
          <View style={styles.configDetail}>
            <Text style={styles.label}>API Key:</Text>
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {razorpayKey ? razorpayKey.substring(0, 10) + '******' : 'Not available'}
              </Text>
            </View>
          </View>
          
          <View style={styles.configDetail}>
            <Text style={styles.label}>Last Updated:</Text>
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {new Date(config.last_updated).toLocaleString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.configDetail}>
            <Text style={styles.label}>Updated By:</Text>
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {config.updated_by}
              </Text>
            </View>
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>
              Use Live Mode
            </Text>
            {isUpdating ? (
              <ActivityIndicator size="small" color="#118347" />
            ) : (
              <Switch
                value={config.is_live_mode}
                onValueChange={handleToggleMode}
                trackColor={{ false: '#d9d9d9', true: '#a7e1be' }}
                thumbColor={config.is_live_mode ? '#118347' : '#f4f3f4'}
                ios_backgroundColor="#d9d9d9"
              />
            )}
          </View>
          
          <View style={styles.warningContainer}>
            <Ionicons
              name="warning-outline"
              size={18}
              color={config.is_live_mode ? '#e74c3c' : '#f39c12'}
            />
            <Text
              style={[
                styles.warningText,
                { color: config.is_live_mode ? '#e74c3c' : '#f39c12' }
              ]}
            >
              {config.is_live_mode
                ? 'LIVE mode processes real payments with actual money!'
                : 'TEST mode is active. No real payments will be processed.'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Payment Configuration Information</Text>
          <Text style={styles.infoText}>
            • Changes to payment settings affect all transactions in the app.
          </Text>
          <Text style={styles.infoText}>
            • Always test payment flows in TEST mode before activating LIVE mode.
          </Text>
          <Text style={styles.infoText}>
            • In TEST mode, use test card numbers provided by Razorpay.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    padding: 24,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      }
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  configDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  valueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9e7',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2980b9',
  },
  infoText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
    lineHeight: 20,
  },
}); 