import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/authContext';
import { getPaymentConfig, updatePaymentMode, isPaymentAdmin, PaymentConfig } from '../../services/supabase/paymentConfigService';

/**
 * Component for managing payment gateway settings in the admin panel
 * This allows administrators to toggle between test and live modes for Razorpay
 */
export default function PaymentConfigPanel() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Check if the user is an admin and fetch the current configuration
  useEffect(() => {
    const checkAdminAndFetchConfig = async () => {
      try {
        setIsLoading(true);
        
        if (!user) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }
        
        // Check if user is an admin
        const adminStatus = await isPaymentAdmin(user.id);
        setIsAdmin(adminStatus);
        
        if (adminStatus) {
          // Fetch current configuration
          const currentConfig = await getPaymentConfig();
          setConfig(currentConfig);
        }
      } catch (error) {
        console.error('Error initializing payment config panel:', error);
        Alert.alert('Error', 'Failed to load payment gateway configuration');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminAndFetchConfig();
  }, [user]);

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
      const confirmed = await new Promise((resolve) => {
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
      await updatePaymentMode(newMode, user.id);
      
      // Update local state
      setConfig({
        ...config,
        is_live_mode: newMode,
        last_updated: new Date().toISOString(),
        updated_by: user.id
      });
      
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

  if (!isAdmin) {
    return null; // Don't render anything for non-admins
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#118347" />
        <Text style={styles.loadingText}>Loading payment configuration...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Ionicons name="card-outline" size={20} color="#118347" />
          <Text style={styles.headerTitle}>Payment Gateway Configuration</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
      </TouchableOpacity>
      
      {expanded && config && (
        <View style={styles.content}>
          <View style={styles.row}>
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
          
          <View style={styles.row}>
            <Text style={styles.label}>API Key:</Text>
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {config.is_live_mode ? 'rzp_live_******' : 'rzp_test_******'}
              </Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Last Updated:</Text>
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {new Date(config.last_updated).toLocaleString()}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 16,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  valueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fef9ef',
    borderRadius: 8,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 13,
    flex: 1,
  },
}); 